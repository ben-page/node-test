'use strict';
const Promise = require('bluebird');
Promise.config({
    cancellation: true
});
const Runner = require('./runner');
const Test = require('./test');
const Hook = require('./hook');

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
        
        this.test = (name2, action, failHandler) => this._addTest(name2, action, failHandler);
        this.only = (name2, action, failHandler) => this._addTest(name2, action, failHandler, {only: true});
        this.skip = (name2, action) => this._addTest(name2, action, undefined, {skip: true});
        this.todo = (name2, action) => this._addTest(name2, action, undefined, {todo: true});
        
        this.serial = {
            test: (name2, action) => this._addTest(name2, action, undefined, {serial: true}),
            only: (name2, action) => this._addTest(name2, action, undefined, {serial: true, only: true}),
            skip: (name2, action) => this._addTest(name2, action, undefined, {serial: true, skip: true}),
            todo: (name2, action) => this._addTest(name2, action, undefined, {serial: true, todo: true}),
        };
        
        this._runner._addSuite(this);
    }
    
    Suite.addReporter = function (Reporter) {
        runner._addReporter(Reporter);
    };
    
    Suite.getNewLibraryCopy = function () {
        return makeInstance();
    };
    
    Suite.prototype._addTest = function(name, action, failHandler, options) {
        if (typeof name !== 'string')
            throw new Error('argument 1 \'name\' should be of type string');
        if (typeof action !== 'function')
            throw new Error('argument 2 \'action\' should be of type function');
        if (failHandler !== undefined && typeof failHandler !== 'function')
            throw new Error('argument 3 \'failHandler\' should be of type function');
        if (this._ran)
            throw new Error('suite is already running');
        this._tests.push(new Test(this, name, action, failHandler, options));
        
        return this;
    };
    
    Suite.prototype.setTimeout = function (delay) {
        this._timeoutDelay = delay;
    };
    
    Suite.prototype.before = function before(action) {
        if (this._ran)
            throw new Error('can\'t add hook after it starts running');
        if (this._before)
            throw new Error('before hook is already defined');
        this._before = new Hook(this, action);
        return this;
    };
    
    Suite.prototype.after = function after(action) {
        if (this._ran)
            throw new Error('can\'t add hook after it starts running');
        if (this._after)
            throw new Error('after hook is already defined');
        this._after = new Hook(this, action);
        return this;
    };
    
    Suite.prototype.beforeEach = function beforeEach(action) {
        if (this._ran)
            throw new Error('can\'t add hook after it starts running');
        if (this._beforeEach)
            throw new Error('beforeEach hook is already defined');
        this._beforeEach = action;
        return this;
    };
    
    Suite.prototype.afterEach = function afterEach(action) {
        if (this._ran)
            throw new Error('can\'t add hook after it starts running');
        if (this._afterEach)
            throw new Error('afterEach hook is already defined');
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