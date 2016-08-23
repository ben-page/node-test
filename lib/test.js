'use strict';
const Promise = require('bluebird');
const Assert = require('./assert');
const util = require('./util');
const domain = require('domain');
const internal = require('./internal');
const report = internal.report;
const beforeEach = internal.beforeEach;
const afterEach = internal.afterEach;
const opts = internal.opts;
const runner = internal.runner;

function Test(suite, name, action, failHandler, options) {
    this.suite = suite;
    this.report = {
        name: name,
        suite: suite[report],
        status: undefined,
        runTime: -1
    };
    this.action = action;
    this.failHandler = failHandler;
    this.options = options || {};
    this.promises = [];
}

Test.prototype.end = function() {
    if (this.options.skip)
        this.report.status = 'skip';
    else if (this.options.todo)
        this.report.status = 'todo';
    else if (this.report.runTime === -1)
        this.report.status = 'stop';
    else if (this.report.err)
        this.report.status = 'fail';
    else
        this.report.status = 'pass';
    
    this.suite[runner].emitTestEnd(this);
};

Test.prototype.run = function() {
    if (domain) {
        const d = domain.create();
    
        d.on('error', err => {
            console.error(`Uncaught Exception in test '${this.report.name}' in suite '${this.report.suite.name}'`);
            console.error(err.stack);
            this.suite[runner].emitError(err);
            //eslint-disable-next-line no-process-exit
            process.exit(1);
        });
    
        return d.run(() => {
            return this.run2();
        });
    }
    
    return this.run2();
};

Test.prototype.run2 = function() {
    const t = new Assert(this);

    return Promise
        .try(() => {
            return util.runAsyncPromise(this.suite[beforeEach], t)
                .timeout(this.suite[opts].timeout);
        })
        
        .then(state => {
            const start = process.hrtime();

            return Promise.all(this.promises.concat(util.runAsyncPromise(this.action, t, state)))
                .timeout(this.suite[opts].timeout)
                .then(() => {
                    this.report.runTime = util.getElapsed(start);
                    return state;
                })
                .catch(err => {
                    this.report.runTime = util.getElapsed(start);
                    if (err instanceof Promise.TimeoutError && Error.captureStackTrace)
                        Error.captureStackTrace(err, this.action);
                    
                    if (this.failHandler) {
                        try {
                            this.failHandler(err, t, state);
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
            return util.runAsyncPromise(this.suite[afterEach], t, state)
                .timeout(this.suite[opts].timeout);
        })
    
        .catch(err => {
            this.report.err = err;
            throw err;
        });
};

Test.prototype.addPromise = function(promise) {
    if (promise.suppressRunawayWarning)
        promise.suppressRunawayWarning();
    this.promises.push(promise);
};

module.exports = Test;
