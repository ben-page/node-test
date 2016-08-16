'use strict';
const Promise = require('bluebird');
Promise.config({
    cancellation: true
});
const Runner = require('./runner');
const Test = require('./test');
const Hook = require('./hook');
const util = require('./util');

function makeInstance() {
    const runner = new Runner();
    
    function Suite(name, options) {
        options = options || {};
        if (typeof name !== 'string')
            throw new Error('argument 1 \'name\' should be of type string');
        this._report = {
            name: name
        };
        this._ran = false;
        this._hasOnly = false;
        this._tests = [];
        this._before = undefined;
        this._after = undefined;
        this._beforeEach = undefined;
        this._afterEach = undefined;
        this._options = options || {};
        this._timeoutDelay = 5000;
        this._runner = runner;
        
        this.test = (name2, action, failHandler) => this._addTest(name2, action, failHandler, {}, this.test);
        this.only = (name2, action, failHandler) => this._addTest(name2, action, failHandler, {only: true}, this.only);
        this.skip = (name2, action) => this._addTest(name2, action, undefined, {skip: true}, this.skip);
        this.todo = (name2, action) => this._addTest(name2, action, undefined, {todo: true}, this.todo);
        
        this.serial = {
            test: (name2, action, failHandler) => this._addTest(name2, action, undefined, {serial: true}, this.serial.test),
            only: (name2, action, failHandler) => this._addTest(name2, action, undefined, {serial: true, only: true}, this.serial.only),
            skip: (name2, action) => this._addTest(name2, action, undefined, {serial: true, skip: true}, this.serial.skip),
            todo: (name2, action) => this._addTest(name2, action, undefined, {serial: true, todo: true}, this.serial.todo),
        };
        
        this._runner._addSuite(this);
    }
    
    Suite.addReporter = function (Reporter) {
        runner._addReporter(Reporter);
    };
    
    Suite.getNewLibraryCopy = function () {
        return makeInstance();
    };
    
    Suite.prototype._addTest = function(name, action, failHandler, options, stackStartFunction) {
        if (typeof name !== 'string')
            util.throwError('argument 1 \'name\' should be of type string', stackStartFunction);
        if (!options.skip && !options.todo && typeof action !== 'function')
            util.throwError('argument 2 \'action\' should be of type function', stackStartFunction);
        if (failHandler !== undefined && typeof failHandler !== 'function')
            util.throwError('argument 3 \'failHandler\' should be of type function', stackStartFunction);
        if (this._ran)
            util.throwError('can\'t add test after suite starts running', stackStartFunction);
        this._tests.push(new Test(this, name, action, failHandler, options));
        
        return this;
    };
    
    Suite.prototype.setTimeout = function (delay) {
        this._timeoutDelay = delay;
    };
    
    Suite.prototype.before = function before(action) {
        if (this._ran)
            util.throwError('can\'t add hook after suite starts running', Suite.prototype.before);
        if (this._before)
            util.throwError('before hook is already defined', Suite.prototype.before);
        this._before = new Hook(this, action);
        return this;
    };
    
    Suite.prototype.after = function after(action) {
        if (this._ran)
            util.throwError('can\'t add hook after suite starts running', Suite.prototype.after);
        if (this._after)
            util.throwError('after hook is already defined', Suite.prototype.after);
        this._after = new Hook(this, action);
        return this;
    };
    
    Suite.prototype.beforeEach = function beforeEach(action) {
        if (this._ran)
            util.throwError('can\'t add hook after suite starts running', Suite.prototype.beforeEach);
        if (this._beforeEach)
            util.throwError('beforeEach hook is already defined', Suite.prototype.beforeEach);
        this._beforeEach = action;
        return this;
    };
    
    Suite.prototype.afterEach = function afterEach(action) {
        if (this._ran)
            util.throwError('can\'t add hook after suite starts running', Suite.prototype.afterEach);
        if (this._afterEach)
            util.throwError('afterEach hook is already defined', Suite.prototype.afterEach);
        this._afterEach = action;
        return this;
    };
        
    //this decouples the test.run() promises from the suite chain, so that cancellation doesn't bubble up
    Suite.prototype._runTests = function (tests, serial) {
        return new Promise(resolve => {
            const total = tests.length;
            let count = 0;
            const promises = [];
            let pass = true;
            
            if (total === 0) {
                resolve(pass);
                return;
            }
    
            if (serial) {
                const iterator = tests[Symbol.iterator]();
                let cancelled = false;
                
                const next = (prevTest) => {
                    if (prevTest) {
                        prevTest._end();
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
                        const p = test._run()
                            .catch(err => {
                                pass = false;
                                if (this._options.failFast)
                                    cancelled = true;
                            });
    
                        p.finally(() => {
                            next(test);
                        });
                    }
                };
                
                next();
                
            } else {
                tests.forEach(test => {
                    const p = test._run()
                        .catch(err => {
                            pass = false;
                            if (this._options.failFast) {
                                for (const promise of promises) {
                                    if (promise.isPending())
                                        promise.cancel();
                                }
                            }
                        });
                    promises.push(p);
                    p.finally(() => {
                        test._end();
                        if (++count === total)
                            resolve(pass);
                    });
                });
            }
        });
    };
    
    Suite.prototype._run = function () {
        this._ran = true;
        
        for (const _test of this._tests) {
            if (_test._options.only) {
                this._hasOnly = true;
                break;
            }
        }
        
        const serialTests = [], asyncTests = [], allTests = [];
        
        for (const test of this._tests) {
            if (this._hasOnly && !test._options.only)
                continue;
            
            allTests.push(test._report);
            
            if (test._options.skip || test._options.todo) {
                test._end();
                continue;
            }
            
            if (test._options.serial)
                serialTests.push(test);
            else
                asyncTests.push(test);
        }
        
        this._report.tests = allTests;
        
        return Promise.resolve(this._before ? this._before._run() : null)
            .catch(err => {
                err.message = 'before hook failed: ' + err.message;
                throw err;
            })
            .then(() => this._runTests(serialTests, true))
            .then(pass1 => {
                return this._runTests(asyncTests, false)
                        .then(pass2 => pass1 && pass2);
            })
            .then(pass => {
                if (pass) {
                    return Promise.resolve(this._after ? this._after._run() : null)
                        .catch(err => {
                            err.message = 'after hook failed: ' + err.message;
                            throw err;
                        });
                }
                
                return undefined;
            })
            .catch(err => {
                this._report.err = err;
            })
            .then(() => {
                this._runner._emitSuiteEnd(this);
            });
    };
    
    return Suite;
}

module.exports = makeInstance();