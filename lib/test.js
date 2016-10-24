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

function Test(suite, name, action, failHandler, options, stack) {
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
    this.stack = stack;
}

Test.prototype.end = function() {
    if (this.options.skip)
        this.report.status = 'skip';
    else if (this.options.todo)
        this.report.status = 'todo';
    else if (this.report.err)
        this.report.status = 'fail';
    else if (this.report.runTime === -1)
        this.report.status = 'stop';
    else
        this.report.status = 'pass';
    
    this.suite[runner].emitTestEnd(this);
};

Test.prototype.run = function() {
    if (domain) {
        const d = domain.create();
        let lastErr;
    
        d.on('error', err => {
            if (lastErr === err)
                return;
            lastErr = err;
            console.error(`Uncaught Exception in test '${this.report.name}' in suite '${this.report.suite.name}'`);
            util.concatStackTraces(err, this.stack);
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

Test.prototype.runPromises = function () {
    if (this.promises.length === 0)
        return Promise.resolve();
    
    const promises = this.promises;
    this.promises = [];
    
    return Promise.all(promises)
        .finally(() => {
            return this.runPromises();
        });
};

Test.prototype.run2 = function() {
    const t = new Assert(this);
    
    const beforeEachHook = this.suite[beforeEach];
    
    return (beforeEachHook
            ? beforeEachHook.run(t)
            : Promise.resolve())
        .then(state => {
            const start = process.hrtime();
            
            let p;
            if (beforeEachHook)
                p = util.runAsyncPromise(this.stack, this.action, t, state);
            else
                p = util.runAsyncPromise(this.stack, this.action, t);

            return Promise.all([p, this.runPromises()])
                .timeout(this.suite[opts].timeout)
                .then(() => {
                    this.report.runTime = util.getElapsed(start);
                    return state;
                })
                .catch(err => {
                    this.report.runTime = util.getElapsed(start);
                    throw err;
                });
        })
        
        .then(state => {
            if (this.suite[afterEach]) {
                let p;
                if (beforeEachHook)
                    p = this.suite[afterEach].run(t, state);
                else
                    p = this.suite[afterEach].run(t);
                
                return p.timeout(this.suite[opts].timeout);
            }
            
            return Promise.resolve();
        })
    
        .catch(err => {
            if (!(err instanceof Error)) {
                err = new Error(err.toString());
                util.concatStackTraces(err, this.stack);
            } else {
                util.concatStackTraces(err, this.stack);
            }
    
            if (this.failHandler) {
                try {
                    this.failHandler(err, t);
                } catch (err2) {
                    if (err instanceof Promise.TimeoutError) {
                        this.report.err = err;
                        throw err;
                    }
    
                    util.concatStackTraces(err2, this.stack);
                    this.report.err = err2;
                    throw err2;
                }
        
                return;
            }
    
            this.report.err = err;
            throw err;
        });
};

Test.prototype.addPromise = function(promise, frames) {
    if (promise.suppressRunawayWarning)
        promise.suppressRunawayWarning();
    this.promises.push(promise
        .catch(err => {
            util.concatStackTraces(err, ...frames);
            throw err;
        }));
};

module.exports = Test;
