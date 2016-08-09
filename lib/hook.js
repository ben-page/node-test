'use strict';
const Assert = require('./assert');
const Test = require('./test');
const util = require('./util');
const timers = require('timers');

function Hook(suite, action) {
    this._report = {};
    this._suite = suite;
    this._action = action;
    this._cancelled = false;
    this._promises = [];
    
    if (typeof action !== 'function')
        throw new Error('invalid hook()');
}

Hook.prototype.cancel = function() {
    this._cancelled = true;
    this._end(0);
};

Hook.prototype._end = function(runTime) {
    this._report.runTime = runTime;
};

Hook.prototype.run = function() {
    if (this._cancelled)
        Promise.resolve();
    
    const t = new Assert(this);
    
    let timeout;
    const resetTimeout = () => {
        timers.clearTimeout(timeout);
        timeout = timers.setTimeout(() => {
            this._cancelled = true;
        }, this._suite._timeoutDelay);
    };
    
    resetTimeout();
    
    const start = process.hrtime();
    
    return util.runAsync(this._action, t)
        .then(() => {
            resetTimeout();
            return Promise.all(this._promises)
        })
        .catch(err => {
            this._report.err = err;
            
            if (this._suite._failFast)
                throw err;
        })
        .finally(() => {
            if (this._cancelled)
                return;
            
            const diff = process.hrtime(start);
            timers.clearTimeout(timeout);
            
            this._end(diff[0] + (diff[1] / 1e9));
        });
};

Hook.prototype.addAsyncAssertion = Test.prototype.addAsyncAssertion;

module.exports = Hook;
