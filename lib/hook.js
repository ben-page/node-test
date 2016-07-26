'use strict';
const Assert = require('./assert');
const Test = require('./test');
const util = require('./util');
const assert = require('assert');
const timers = require('timers');

function Hook(suite, action) {
    this._suite = suite;
    this._action = action;
    this._timedOut = false;
    this._promises = [];
    
    if (typeof action !== 'function')
        throw new Error('invalid hook()');
}

Hook.prototype.getError = function() {
    return this._err;
};

Hook.prototype.run = function() {
    const t = new Assert(this);
    
    let timeout, runPromise;
    const resetTimeout = () => {
        timers.clearTimeout(timeout);
        timeout = timers.setTimeout(() => {
            runPromise.cancel();
        }, this._suite._timeoutDelay);
    };
    
    resetTimeout();
    
    runPromise = util.runAsync1(this._action, t)
        .then(() => {
            resetTimeout();
            return Promise.all(this._promises)
        })
        .finally(() => {
            timers.clearTimeout(timeout);
            if (runPromise.isCancelled())
                throw new Error('Timed Out');
        });
    
    return runPromise;
};

Hook.prototype.addAsyncAssertion = Test.prototype.addAsyncAssertion;

module.exports = Hook;
