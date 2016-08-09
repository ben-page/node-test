'use strict';
const Promise = require('bluebird');
const runner = require('./runner');
const Assert = require('./assert');
const util = require('./util');
const timers = require('timers');

function Test(suite, name, action, options) {
    this._suite = suite;
    this._report = {
        name: name,
        status: undefined,
        runTime: undefined
    };
    this._action = action;
    this._only = !!(options && options.only);
    this._skip = !!(options && options.skip);
    this._todo = !!(options && options.todo);
    this._serial = !!(options && options.serial);
    this._promise = Promise.resolve();
    this._validateFailure = undefined;
    this._cancelled = false;
    
    if (!name || (!this._todo && typeof action !== 'function'))
        throw new Error('invalid test()');
}

Test.prototype.cancel = function() {
    this._cancelled = true;
    this._end(0);
    runner._emitTestEnd(this);
};

Test.prototype._end = function(runTime) {
    if (this._cancelled)
        this._report.status = 'stop';
    else if (this._skip)
        this._report.status = 'skip';
    else if (this._todo)
        this._report.status = 'todo';
    else if (this._report.err)
        this._report.status = 'fail';
    else
        this._report.status = 'pass';

    this._report.runTime = runTime;
};

Test.prototype.run = function() {
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
    
    return util.runAsync1(this._suite._beforeEach, t)
        .then(state => {
            resetTimeout();
            if (this._cancelled)
                throw new Error('Timed Out');
            
            return util.runAsync2(this._action, t, state)
                .return(this._promise)
                .return(state);
        })
        .then(state => {
            resetTimeout();
            if (this._cancelled)
                throw new Error('Timed Out');

            return util.runAsync2(this._suite._afterEach, t, state);
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

            if (this._report.err && this._validateFailure) {
                let errors;
                try {
                    this._validateFailure(this._report.err);
                } catch (err) {
                    errors = true;
                }

                if (!errors)
                    this._report.err = undefined;
            }

            this._end(diff[0] + (diff[1] / 1e9));
        });
};

Test.prototype.addPromise = function(promise) {
    if (promise.suppressRunawayWarning)
        promise.suppressRunawayWarning();
    this._promise = this._promise.return(promise);
};

module.exports = Test;
