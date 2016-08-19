'use strict';
const Promise = require('bluebird');
const Assert = require('./assert');
const util = require('./util');
const domain = require('domain');

function Test(suite, name, action, failHandler, options) {
    this._suite = suite;
    this._report = {
        name: name,
        suite: suite._report,
        status: undefined,
        runTime: -1
    };
    this._action = action;
    this._failHandler = failHandler;
    this._options = options || {};
    this._promise = Promise.resolve();
}

Test.prototype._end = function() {
    if (this._options.skip)
        this._report.status = 'skip';
    else if (this._options.todo)
        this._report.status = 'todo';
    else if (this._report.runTime === -1)
        this._report.status = 'stop';
    else if (this._report.err)
        this._report.status = 'fail';
    else
        this._report.status = 'pass';
    
    this._suite._runner._emitTestEnd(this);
};

Test.prototype._run = function() {
    const d = domain.create();
    
    d.on('error', err => {
        console.error(`Uncaught Exception in test '${this._report.name}' in suite '${this._report.suite.name}'`);
        console.error(err.stack);
        process.exit(1);
    });

    return d.run(() => {
        return this._run2();
    });
};

Test.prototype._run2 = function() {
    const t = new Assert(this);

    return Promise
        .try(() => {
            return util.runAsyncPromise(this._suite._beforeEach, t)
                .timeout(this._suite._timeoutDelay);
        })
        
        .then(state => {
            const start = process.hrtime();
            
            return Promise.resolve(util.runAsyncPromise(this._action, t, state)
                .then(() => this._promise))
                .timeout(this._suite._timeoutDelay)
                .then(() => {
                    this._report.runTime = util.getElapsed(start);
                    return state;
                })
                .catch(err => {
                    this._report.runTime = util.getElapsed(start);
                    
                    if (this._failHandler) {
                        try {
                            this._failHandler(err, t, state);
                        } catch (err2) {
                            if (err instanceof Promise.TimeoutError)
                                throw err;
                            throw err2;
                        }
                        
                        return state;
                    }
            
                    throw err;
                });
        })
        
        .then(state => {
            return util.runAsyncPromise(this._suite._afterEach, t, state)
                .timeout(this._suite._timeoutDelay);
        })
    
        .catch(err => {
            this._report.err = err;
            throw err;
        });
};

Test.prototype._addPromise = function(promise) {
    if (promise.suppressRunawayWarning)
        promise.suppressRunawayWarning();
    this._promise = this._promise.then(() => promise);
};

module.exports = Test;
