'use strict';
const Promise = require('bluebird');
const util = require('./util');
const Test = require('./test');
const reporter = require('./reporter');
const timers = require('timers');

function Suite(name, options) {
    options = options || {};
    this._name = name;
    this._ran = false;
    this._hasOnly = false;
    this._tests = [];
    this._before = undefined;
    this._after = undefined;
    this._beforeEach = undefined;
    this._afterEach = undefined;
    this._failFast = options.failFast;
    
    this.test = (name2, action) => addTest.call(this, name2, action);
    this.only = (name2, action) => addTest.call(this, name2, action, { only: true });
    this.skip = (name2, action) => addTest.call(this, name2, action, { skip: true });
    this.todo = (name2, action) => addTest.call(this, name2, action, { todo: true });
    this.failing = (name2, action) => addTest.call(this, name2, action, { failing: true });
    
    this.serial = {
        test: (name2, action) => addTest.call(this, name2, action, { serial: true }),
        only: (name2, action) => addTest.call(this, name2, action, { serial: true, only: true }),
        skip: (name2, action) => addTest.call(this, name2, action, { serial: true, skip: true }),
        todo: (name2, action) => addTest.call(this, name2, action, { serial: true, todo: true }),
        failing: (name2, action) => addTest.call(this, name2, action, { serial: true, failing: true })
    };
    
    timers.setImmediate(() => {
        this.run();
    });
}

function addTest(name, action, options) {
    if (this._ran)
        throw new Error('can\'t add test after it starts running');
    this._tests.push(new Test(name, action, options));
}

Suite.prototype.getName = function() {
    return this._name;
};

Suite.prototype.hasOnly = function() {
    return this._hasOnly;
};

Suite.prototype.before = function before(action) {
    if (this._ran)
        throw new Error('can\'t add hook after it starts running');
    if (this._before)
        throw new Error('before hook is already defined');
    this._before = action;
};

Suite.prototype.after = function after(action) {
    if (this._ran)
        throw new Error('can\'t add hook after it starts running');
    if (this._after)
        throw new Error('after hook is already defined');
    this._after = action;
};

Suite.prototype.beforeEach = function beforeEach(action) {
    if (this._ran)
        throw new Error('can\'t add hook after it starts running');
    if (this._beforeEach)
        throw new Error('beforeEach hook is already defined');
    this._beforeEach = action;
};

Suite.prototype.afterEach = function afterEach(action) {
    if (this._ran)
        throw new Error('can\'t add hook after it starts running');
    if (this._afterEach)
        throw new Error('afterEach hook is already defined');
    this._afterEach = action;
};

Suite.prototype.runTest = function(test) {
    return util.runAsync0(this._beforeEach)
        .then(state => {
            return util.runAsync1(test._action, state)
                .return(state);
        })
        .then(state => {
            return util.runAsync1(this._afterEach, state);
        })
        .catch(err => {
            test._ran = true;
            test._err = err;
            if (this._failFast)
                throw err;
        })
        .then(() => {
            test._ran = true;
        });
};

Suite.prototype.run = function() {
    this._ran = true;
    
    for (const _test of this._tests) {
        if (_test.hasOption('only')) {
            this._hasOnly = true;
            break;
        }
    }
    
    return util.runAsync0(this._before)
        .catch(err => {
            reporter.reportFatal(this._name + ' - before hook failed', err);
            throw err;
        })
        .then(() => {
            const serial = [], async = [];
            
            for (const _test of this._tests) {
                if (_test.hasOption('skip') || _test.hasOption('todo')
                    || (this._hasOnly && !_test.hasOption('only')))
                    continue;
    
                if (_test.hasOption('serial'))
                    serial.push(_test);
                else
                    async.push(_test);
            }
            
            return Promise
                .mapSeries(serial, (_test, i) => {
                    return this.runTest(_test);
                })
                .then(() => {
                    return Promise.map(async, (_test) => {
                        return this.runTest(_test);
                    });
                })
                .then(() => {
                    return util.runAsync0(this._after)
                        .catch(err => {
                            reporter.reportFatal(this._name + ' - after hook failed', err);
                            throw err;
                        });
                });
                
        })
        .catch(err => {
            //swallow Error, because it's either be displayed (before() or after()) or will be by the reporter
        })
        .finally(() => {
            return reporter.reportSuite(this);
        });
};

module.exports = Suite;