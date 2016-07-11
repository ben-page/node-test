'use strict';
const Test = require('./test');
const isPromise = require('./is-promise');
const reporter = require('./reporter');

function Suite(name) {
    this._name = name;
    this._ran = false;
    this._tests = [];
    this._hasOnly = false;
    this._before = undefined;
    this._after = undefined;
    this._beforeEach = undefined;
    this._afterEach = undefined;
    
    setImmediate(() => {
        this.run();
    });
}

Suite.prototype.getName = function() {
    return this._name;
};

Suite.prototype.hasOnly = function() {
    return this._hasOnly;
};

Suite.prototype.test = function(name, action) {
    if (this._ran)
        throw new Error('can\'t add test after it starts running');
    this._tests.push(new Test(this, name, action));
};

Suite.prototype.only = function(name, action) {
    if (this._ran)
        throw new Error('can\'t add test after it starts running');
    this._tests.push(new Test(this, name, action, { only: true }));
    this._hasOnly = true;
};

Suite.prototype.skip = function(name, action) {
    if (this._ran)
        throw new Error('can\'t add test after it starts running');
    this._tests.push(new Test(this, name, action, { skip: true }));
};

Suite.prototype.todo = function(name, action) {
    if (this._ran)
        throw new Error('can\'t add test after it starts running');
    this._tests.push(new Test(this, name, action, { todo: true }));
};

Suite.prototype.failing = function(name, action) {
    if (this._ran)
        throw new Error('can\'t add test after it starts running');
    this._tests.push(new Test(this, name, action, { failing: true }));
};

Suite.prototype.before = function(action) {
    if (this._ran)
        throw new Error('can\'t add hook after it starts running');
    if (this._before)
        throw new Error('before hook is already defined');
    this._before = action;
};

Suite.prototype.after = function(action) {
    if (this._ran)
        throw new Error('can\'t add hook after it starts running');
    if (this._after)
        throw new Error('after hook is already defined');
    this._after = action;
};

Suite.prototype.beforeEach = function(action) {
    if (this._ran)
        throw new Error('can\'t add hook after it starts running');
    if (this._beforeEach)
        throw new Error('beforeEach hook is already defined');
    this._beforeEach = action;
};

Suite.prototype.afterEach = function(action) {
    if (this._ran)
        throw new Error('can\'t add hook after it starts running');
    if (this._afterEach)
        throw new Error('afterEach hook is already defined');
    this._afterEach = action;
};

function runHook(hook, arg1) {
    if (hook === undefined)
        return Promise.resolve();
    
    let result;
    try {
        result = hook(arg1);
    } catch (err) {
        return Promise.reject(err);
    }
    
    if (isPromise(result))
        return result;
    else
        return Promise.resolve();
}

Suite.prototype.run = function() {
    this._ran = true;
    
    return runHook(this._before)
        .then(() => {
            const promises = [];
            
            for (const _test of this._tests) {
                if (!_test.hasOption('skip')
                    && !_test.hasOption('todo')
                    && (!this._hasOnly || _test.hasOption('only')))
                    promises.push(_test.run(this._beforeEach, this._afterEach));
            }
            
            return Promise
                .all(promises)
                .then(() => {
                    return runHook(this._after)
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
        });
};

module.exports = Suite;