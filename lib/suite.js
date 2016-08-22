'use strict';
const Promise = require('bluebird');
Promise.config({
    cancellation: true
});
const Runner = require('./runner');
const Test = require('./test');
const Hook = require('./hook');
const util = require('./util');
const internal = require('./internal');

const report = internal.report;
const ran = Symbol('ran');
const hasOnly = Symbol('hasOnly');
const tests = Symbol('tests');
const before = Symbol('before');
const after = Symbol('after');
const beforeEach = internal.beforeEach;
const afterEach = internal.afterEach;
const opts = internal.opts;
const runner = internal.runner;
const addTest = Symbol('addTest');
const runTests = Symbol('runTests');
const run = internal.run;

function makeInstance() {
    const _runner = new Runner();
    
    function Suite(suiteName) {
        if (typeof suiteName !== 'string')
            throw new Error('argument 1 \'name\' should be a string');
        this[report] = {
            name: suiteName
        };
        this[ran] = false;
        this[hasOnly] = false;
        this[tests] = [];
        this[before] = undefined;
        this[after] = undefined;
        this[beforeEach] = undefined;
        this[afterEach] = undefined;
        this[opts] = {
            failFast: false,
            timeout: 5000
        };
        this[runner] = _runner;
        
        this.test = (testName, action, failHandler) => this[addTest](testName, action, failHandler, {}, this.test);
        this.only = (testName, action, failHandler) => this[addTest](testName, action, failHandler, {only: true}, this.only);
        this.skip = (testName, action) => this[addTest](testName, action, undefined, {skip: true}, this.skip);
        this.todo = (testName, action) => this[addTest](testName, action, undefined, {todo: true}, this.todo);
        
        this.serial = {
            test: (testName, action, failHandler) => this[addTest](testName, action, undefined, {serial: true}, this.serial.test),
            only: (testName, action, failHandler) => this[addTest](testName, action, undefined, {serial: true, only: true}, this.serial.only),
            skip: (testName, action) => this[addTest](testName, action, undefined, {serial: true, skip: true}, this.serial.skip),
            todo: (testName, action) => this[addTest](testName, action, undefined, {serial: true, todo: true}, this.serial.todo),
        };
    
        this[runner].addSuite(this);
    }
    
    Suite.addReporter = function (Reporter) {
        _runner.addReporter(Reporter);
    };
    
    Suite.getNewLibraryCopy = function () {
        return makeInstance();
    };
    
    Suite.prototype.config = function (options) {
        if (typeof options !== 'object' || options === null)
            util.throwError('argument 1 \'options\' should be a object', Suite.prototype.config);
        if (typeof options.failFast !== 'boolean' && typeof options.failFast !== 'undefined')
            util.throwError('option \'failFast\' should be a boolean', Suite.prototype.config);
        if (options.timeout && typeof options.timeout !== 'number')
            util.throwError('option \'timeout\' should be a number', Suite.prototype.config);
        
        this[opts].failFast = !!options.failFast;
        this[opts].timeout = options.timeout || this[opts].timeout;
    };
    
    Suite.prototype.setTimeout = function (delay) {
        console.warn('setTimeout is deprecated');
        if (typeof delay !== 'number')
            util.throwError('argument 1 \'delay\' should be a number', Suite.prototype.setTimeout);
        this[opts].timeout = delay;
    };
    
    Suite.prototype[addTest] = function(name, action, failHandler, options, stackStartFunction) {
        if (typeof name !== 'string')
            util.throwError('argument 1 \'name\' should be a string', stackStartFunction);
        if (!options.skip && !options.todo && typeof action !== 'function')
            util.throwError('argument 2 \'action\' should be a function', stackStartFunction);
        if (failHandler !== undefined && typeof failHandler !== 'function')
            util.throwError('argument 3 \'failHandler\' should be a function', stackStartFunction);
        if (this[ran])
            util.throwError('can\'t add test after suite starts running', stackStartFunction);
        this[tests].push(new Test(this, name, action, failHandler, options));
        
        return this;
    };
    
    Suite.prototype.before = function (action) {
        if (this[ran])
            util.throwError('can\'t add hook after suite starts running', Suite.prototype.before);
        if (this[before])
            util.throwError('before hook is already defined', Suite.prototype.before);
        this[before] = new Hook(this, action);
        return this;
    };
    
    Suite.prototype.after = function (action) {
        if (this[ran])
            util.throwError('can\'t add hook after suite starts running', Suite.prototype.after);
        if (this[after])
            util.throwError('after hook is already defined', Suite.prototype.after);
        this[after] = new Hook(this, action);
        return this;
    };
    
    Suite.prototype.beforeEach = function (action) {
        if (this[ran])
            util.throwError('can\'t add hook after suite starts running', Suite.prototype.beforeEach);
        if (this[beforeEach])
            util.throwError('beforeEach hook is already defined', Suite.prototype.beforeEach);
        this[beforeEach] = action;
        return this;
    };
    
    Suite.prototype.afterEach = function (action) {
        if (this[ran])
            util.throwError('can\'t add hook after suite starts running', Suite.prototype.afterEach);
        if (this[afterEach])
            util.throwError('afterEach hook is already defined', Suite.prototype.afterEach);
        this[afterEach] = action;
        return this;
    };
        
    //this decouples the test.run() promises from the suite chain, so that cancellation doesn't bubble up
    Suite.prototype[runTests] = function (_tests, serial) {
        return new Promise(resolve => {
            const total = _tests.length;
            let count = 0;
            const promises = [];
            let pass = true;
            
            if (total === 0) {
                resolve(pass);
                return;
            }
    
            if (serial) {
                const iterator = _tests[Symbol.iterator]();
                let cancelled = false;
                
                const next = (prevTest) => {
                    if (prevTest) {
                        prevTest.end();
                        if (++count === total) {
                            resolve(pass);
                            return;
                        }
                    }
                    
                    const entry = iterator.next();
                    if (entry.done)
                        return;
                    const test = entry.value;
                    
                    if (cancelled) {
                        next(test);
                        
                    } else {
                        const p = test.run()
                            .catch(err => {
                                pass = false;
                                if (this[opts].failFast)
                                    cancelled = true;
                            });
    
                        p.finally(() => {
                            next(test);
                        });
                    }
                };
                
                next();
                
            } else {
                _tests.forEach(test => {
                    const p = test.run()
                        .catch(err => {
                            pass = false;
                            if (this[opts].failFast) {
                                for (const promise of promises) {
                                    if (promise.isPending())
                                        promise.cancel();
                                }
                            }
                        });
                    promises.push(p);
                    p.finally(() => {
                        test.end();
                        if (++count === total)
                            resolve(pass);
                    });
                });
            }
        });
    };
    
    Suite.prototype[run] = function () {
        this[ran] = true;
        
        for (const test of this[tests]) {
            if (test.options.only) {
                this[hasOnly] = true;
                break;
            }
        }
        
        const serialTests = [], asyncTests = [], allTests = [];
        
        for (const test of this[tests]) {
            if (this[hasOnly] && !test.options.only)
                continue;
            
            allTests.push(test.report);
            
            if (test.options.skip || test.options.todo) {
                test.end();
                continue;
            }
            
            if (test.options.serial)
                serialTests.push(test);
            else
                asyncTests.push(test);
        }
        
        this[report].tests = allTests;
        
        return Promise.resolve(this[before] ? this[before].run() : null)
            .catch(err => {
                err.message = 'before hook failed: ' + err.message;
                throw err;
            })
            .then(() => this[runTests](serialTests, true))
            .then(pass1 => {
                return this[runTests](asyncTests, false)
                        .then(pass2 => pass1 && pass2);
            })
            .then(pass => {
                if (pass) {
                    return Promise.resolve(this[after] ? this[after].run() : null)
                        .catch(err => {
                            err.message = 'after hook failed: ' + err.message;
                            throw err;
                        });
                }
                
                return undefined;
            })
            .catch(err => {
                this[report].err = err;
            })
            .then(() => {
                this[runner].emitSuiteEnd(this);
            });
    };
    
    return Suite;
}

module.exports = makeInstance();