'use strict';
const Assert = require('./assert');
const util = require('./util');
const domain = require('domain');
const internal = require('./internal');
const promise = require('./promise');

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
    if (domain && false) {
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

Test.prototype.runPromises = async function () {
    if (this.promises.length === 0)
        return;
    
    const promises = this.promises;
    this.promises = [];

    try {
        await Promise.all(promises);
    } finally {
        await this.runPromises();
    }
};

Test.prototype.run2 = async function() {
    const t = new Assert(this);

    const beforeEachHook = this.suite[beforeEach];
    const afterEachHook = this.suite[afterEach];
    let state;

    try {
        if (this.suite[beforeEach]) {
            state = await promise.timeout(() => {
                return beforeEachHook.run(t);
            }, this.suite[opts].timeout);
        }

        const start = process.hrtime();

        let p;
        if (beforeEachHook)
            p = util.runAsync(this.stack, this.action, t, state);
        else
            p = util.runAsync(this.stack, this.action, t);

        try {
            await promise.timeout(() => {
                return Promise.all([p, this.runPromises()]);
            }, this.suite[opts].timeout);
        } finally {
            this.report.runTime = util.getElapsed(start);
        }

        if (afterEachHook) {
            await promise.timeout(() => {
                if (beforeEachHook)
                    return beforeEachHook.run(t, state);
                else
                    return beforeEachHook.run(t);
            }, this.suite[opts].timeout);
        }
    } catch (err) {
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
                if (err instanceof promise.PromiseTimeoutError) {
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
    }
};

Test.prototype.addPromise = function(promise, frames) {
    this.promises.push(promise
        .catch(err => {
            util.concatStackTraces(err, ...frames);
            throw err;
        }));
};

module.exports = Test;
