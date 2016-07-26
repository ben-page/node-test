'use strict';
const Assert = require('./assert');
const util = require('./util');
const assert = require('assert');
const timers = require('timers');

function Test(suite, title, action, options) {
    this._suite = suite;
    this._title = title;
    this._action = action;
    this._options = options || {};
    this._ran = false;
    this._timedOut = false;
    this._promises = [];
    
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
                .then(() => {
                    return Promise.all(this._promises)
                })
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

Test.prototype.addAsyncAssertion = function(fn, count, message) {
    if (typeof fn !== 'function')
        throw new TypeError('count must be a number');
    
    if (count === undefined)
        count = 1;
    
    if (typeof count !== 'number')
        throw new TypeError('count must be a number');
    
    switch (fn.length) {
        case 0: {
            if (count !== undefined && count !== 1)
                throw new Promise('function must either have a callback argument or count must be 1');
    
            const p = fn();
            if (!util.isPromise(p))
                throw new Error('function must either return a Promise or have a callback argument');
    
            this._promises.push(p);
            break;
        }
        
        case 1: {
            const p = new Promise((resolve, reject) => {
                let c = 0, fulfilled = false;
                const callback = () => {
                    if (fulfilled)
                        throw new Error('callback executed after test completed');
                    
                    c++;
                    if (c === count) {
                        //wait a tick before resolving to give other code a chance to run
                        // this will hopefully catch the callback being call too many times
                        const c2 = c;
                        timers.setImmediate(() => {
                            if (c2 === c) { //make sure the count hasn't changed
                                fulfilled = true;
                                resolve();
                            }
                        });
                        
                    } else if (c > count) {
                        fulfilled = true;
                        reject(new assert.AssertionError({
                            actual: c,
                            expected: count,
                            operator: '===',
                            message: message,
                            stackStartFunction: Assert.prototype.async
                        }));
                    }
                };
                try {
                    fn(callback);
                } catch (err) {
                    fulfilled = true;
                    reject(err);
                }
            });
            this._promises.push(p);
            
            break;
        }
        
        default:
            throw new Error('function must have 0 or 1 arguments');
    }
};

module.exports = Test;
