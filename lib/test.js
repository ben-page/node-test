'use strict';
const Assert = require('./assert');
const util = require('./util');
const timers = require('timers');
const Promise = require('bluebird');

function Test(suite, title, action, options) {
    this._suite = suite;
    this._title = title;
    this._action = action;
    this._options = options || {};
    this._ran = false;
    this._timedOut = false;
    this._promise = Promise.resolve();
    
    if (!title || (!this._options.todo && typeof action !== 'function'))
        throw new Error('invalid test()');
}

Test.prototype.getResolution = function() {
    if (!this._ran)
        return 'stop';
    
    if (this._timedOut)
        return 'fail';
    
    if (this._options.skip)
        return 'skip';
        
    if (this._options.todo)
        return 'todo';
    
    if (this._err)
        return 'fail';
    else
        return 'pass';
};

Test.prototype.getError = function() {
    return this._err;
};

Test.prototype.getTitle = function() {
    return this._title;
};

Test.prototype.hasOption = function(option) {
    return !!this._options[option];
};

Test.prototype.run = function() {
    const t = new Assert(this);
    
    let timeout, runPromise;
    const resetTimeout = () => {
        timers.clearTimeout(timeout);
        timeout = timers.setTimeout(() => {
            runPromise.cancel();
            this._ran = true;
            this._err = 'Error: Timed Out';
        }, this._suite._timeoutDelay);
    };
    
    resetTimeout();
    
    runPromise = util.runAsync0(this._suite._beforeEach, t)
        .then(state => {
            resetTimeout();
            
            return util.runAsync1(this._action, t, state)
                .return(this._promise)
                .return(state);
        })
        .then(state => {
            resetTimeout();
            return util.runAsync1(this._suite._afterEach, t, state);
        })
        .finally(() => {
            timers.clearTimeout(timeout);
            this._ran = true;
            if (runPromise.isCancelled())
                throw new Error('Timed Out');
        })
        .catch(err => {
            this._err = err;
            if (this._failFast)
                throw err;
        });
    
    return runPromise;
};

Test.prototype.addPromise = function(promise) {
    if (promise.suppressRunawayWarning)
        promise.suppressRunawayWarning();
    this._promise = this._promise.return(promise);
};

module.exports = Test;
