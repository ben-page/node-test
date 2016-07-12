'use strict';
const Promise = require('bluebird');
const util = require('./util');
const Test = require('./test');
const reporter = require('./reporter');

function Suite(name) {
    this._name = name;
    this._ran = false;
    this._hasOnly = false;
    this._tests = [];
    this._before = undefined;
    this._after = undefined;
    this._beforeEach = undefined;
    this._afterEach = undefined;
    
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
    
    setImmediate(() => {
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

Suite.prototype.run = function() {
    this._ran = true;
    
    for (const _test of this._tests) {
        if (_test.hasOption('only')) {
            this._hasOnly = true;
            break;
        }
    }
    
    return util.runAsync0(this._before)
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
                .mapSeries(serial, (_test) => {
                    return _test.run(this._beforeEach, this._afterEach);
                })
                .then(() => {
                    return Promise.map(async, (_test) => {
                        return _test.run(this._beforeEach, this._afterEach);
                    });
                })
                .then(() => {
                    return util.runAsync0(this._after)
                        .then(() => {
                            return reporter.reportSuite(this);
                        },
                        err => {
                            reporter.reportFatal(this._name + ' - after hook failed', err);
                        });
                });
                
        },
        err => {
            reporter.reportFatal(this._name + ' - before hook failed', err);
        })
        .catch(err => {
            console.error(err);
        });
};

module.exports = Suite;