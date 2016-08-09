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
    this._promise = Promise.resolve();
    
    if (typeof action !== 'function')
        throw new Error('invalid hook()');
}
Hook.prototype._end = function(runTime) {
    this._report.runTime = runTime;
};

Hook.prototype.run = function() {
    if (this._cancelled)
        return Promise.resolve();
    
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
        .return(this._promise)
        .then(() => {
            if (this._cancelled)
                throw new Error('Timed Out');
        })
        .catch(err => {
            this._report.err = err;
            
            if (this._suite._failFast)
                throw err;
        })
        .finally(() => {
            const diff = process.hrtime(start);
            timers.clearTimeout(timeout);
            
            if (!this._cancelled && this._report.err && this._validateFailure) {
                let errors;
                try {
                    this._validateFailure(this._report.err);
                } catch (err) {
                    errors = true;
                }
                
                if (!errors)
                    this._report.err = undefined;
            }
            
            this._end(Math.round(diff[0] / 1e3 + (diff[1] / 1e6)));
        });
};

Hook.prototype._addPromise = Test.prototype._addPromise;

module.exports = Hook;
