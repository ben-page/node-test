'use strict';
const stackTraces = require('./stackTraces');
const { AsyncResource } = require('async_hooks');
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


module.exports = class Test extends AsyncResource {
    constructor(suite, name, action, failHandler, options) {
        super('node-test.Test');

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

    end() {
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
        this.emitDestroy();
    }

    run() {
        // if (domain && false) {
        //     const d = domain.create();
        //     let lastErr;
        //
        //     d.on('error', err => {
        //         if (lastErr === err)
        //             return;
        //         lastErr = err;
        //         console.error(`Uncaught Exception in test '${this.report.name}' in suite '${this.report.suite.name}'`);
        //         console.error(err.stack);
        //         this.suite[runner].emitError(err);
        //         //eslint-disable-next-line no-process-exit
        //         process.exit(1);
        //     });
        //
        //     return d.run(() => {
        //         return this.run2();
        //     });
        // }

        return this.run2();
    }

    async runPromises() {
        if (this.promises.length === 0)
            return;

        const promises = this.promises;
        this.promises = [];

        try {
            await Promise.all(promises);
        } finally {
            await this.runPromises();
        }
    }

    async run2() {
        const t = new Assert(this);

        const beforeEachHook = this.suite[beforeEach];
        const afterEachHook = this.suite[afterEach];
        let state;

        try {
            if (this.suite[beforeEach]) {
                state = await promise.timeout(async () => {
                    this.emitBefore();
                    const result = await beforeEachHook.run(t);
                    this.emitAfter();
                    return result;
                }, this.suite[opts].timeout);
            }

            const start = process.hrtime();

            this.emitBefore();
            const p = util.runAsync(this.action, t);

            try {
                await promise.timeout(() => {
                    return Promise.all([p, this.runPromises()]);
                }, this.suite[opts].timeout);
            } finally {
                this.report.runTime = util.getElapsed(start);
            }
            this.emitAfter();

            if (afterEachHook) {
                await promise.timeout(async () => {
                    this.emitBefore();
                    const result = await afterEachHook.run(t, state);
                    this.emitAfter();
                    return result;
                }, this.suite[opts].timeout);
            }
        } catch (err) {
            stackTraces.setAsyncStackTrace(err);
            if (this.failHandler) {
                try {
                    this.failHandler(err, t);
                } catch (err2) {
                    if (err instanceof promise.PromiseTimeoutError) {
                        this.report.err = err;
                        throw err;
                    }

                    this.report.err = err2;
                    throw err2;
                }

                return;
            }

            this.report.err = err;
            throw err;
        }
    }

    addPromise(promise) {
        this.promises.push(promise);
    }
};
