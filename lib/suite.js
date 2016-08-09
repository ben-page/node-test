'use strict';
const Promise = require('bluebird');
const runner = require('./runner');
const Test = require('./test');
const Hook = require('./hook');

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
    this._failFast = !!(options && options.failFast);
    this._timeoutDelay = 5000;

    this.test = (name2, action) => addTest.call(this, name2, action);
    this.only = (name2, action) => addTest.call(this, name2, action, { only: true });
    this.skip = (name2, action) => addTest.call(this, name2, action, { skip: true });
    this.todo = (name2, action) => addTest.call(this, name2, action, { todo: true });

    this.serial = {
        test: (name2, action) => addTest.call(this, name2, action, { serial: true }),
        only: (name2, action) => addTest.call(this, name2, action, { serial: true, only: true }),
        skip: (name2, action) => addTest.call(this, name2, action, { serial: true, skip: true }),
        todo: (name2, action) => addTest.call(this, name2, action, { serial: true, todo: true }),
    };

    runner._addSuite(this);
}

Suite.addReporter = function(Reporter) {
    runner._addReporter(Reporter);
};

function addTest(name, action, options) {
    if (typeof name !== 'string')
        throw new Error('argument 1 \'name\' should be of type string');
    if (typeof name !== 'string')
        throw new Error('argument 2 \'action\' should be of type function');
    if (this._ran)
        throw new Error('suite is already running');
    this._tests.push(new Test(this, name, action, options));
    
    return this;
}

Suite.prototype.setTimeout = function(delay) {
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

Suite.prototype._run = function() {
    this._ran = true;

    for (const _test of this._tests) {
        if (_test._only) {
            this._hasOnly = true;
            break;
        }
    }

    const serialTests = [], asyncTests = [], allTests = [];

    for (const test of this._tests) {
        if (this._hasOnly && !test._only)
            continue;
    
        allTests.push(test._report);

        if (test._skip || test._todo) {
            test._cancel();
            test._end();
            continue;
        }

        if (test._serial)
            serialTests.push(test);
        else
            asyncTests.push(test);
    }

    this._report.tests = allTests;

    return Promise.resolve(this._before ? this._before.run() : null)
        .catch(err => {
            err.message = 'before hook failed: ' + err.message;
            throw err;
        })
        .then(() => {
            let pass = true;
    
            return Promise.mapSeries(serialTests,
                test => {
                    return test._run()
                        .catch(err => {
                            //cancelling any running tests
                            for (const test2 of this._tests) {
                                if (!test2._report.status)
                                    test2._cancel();
                            }
                    
                            pass = false;
                        });
                })
                .then(() => {
                    return Promise.map(asyncTests, test => {
                        return test._run()
                            .catch(err => {
                                //cancelling any running tests
                                for (const test2 of this._tests) {
                                    if (!test2._report.status)
                                        test2._cancel();
                                }
                        
                                pass = false;
                            });
                    });
                })
                .then(() => {
                    return pass;
                });
        })
        .then(pass => {
            if (pass) {
                return Promise.resolve(this._after ? this._after.run() : null)
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
            runner._emitSuiteEnd(this);
        });
};

module.exports = Suite;