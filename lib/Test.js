'use strict';
const { AsyncResource } = require('async_hooks');
const Assert = require('./Assert');
const shared = require('./shared');
const promise = require('./promise');
const context = require('./context');

const report = shared.report;
const beforeEach = shared.beforeEach;
const afterEach = shared.afterEach;
const opts = shared.opts;
const runner = shared.runner;

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
        context.createContext(this.asyncId(), {
            error: err => {
                this.report.err = err;
            },
            end: () => {
                // console.log(this.report.name + ' has ended');
                this.end();
                this._end();
            }
        });
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
        const p = new Promise(resolve => {
            this._end = resolve;
        });

        return Promise.all([this.run2(), p]);
    }
    //fn() is executed synchronously. If it has an asynchronous callback, the callback will be promisified.
    static runAsync(fn, ...args) {
        if (fn === undefined)
            return undefined;

        if (fn.length > args.length + 1)
            throw new Error(`expected expected ${args.length + 1} arguments, but ${fn.length} arguments were provided`);

        if (fn.length === args.length + 1) { //expects callback
            let executed,
                executedErr,
                reject = err => {
                    executedErr = err;
                },
                resolve = () => {
                };

            const callback = err => {
                if (executed)
                    return;
                executed = true;

                if (err)
                    reject(err);
                else
                    resolve();
            };

            let result;
            switch (args.length) {
                case 0:
                    result = fn(callback);
                    break;

                case 1:
                    result = fn(args[0], callback);
                    break;

                case 2:
                    result = fn(args[0], args[1], callback);
                    break;

                default:
                    throw new Error(`missing support for ${args.length} args`);
            }

            if (executed) { //callback was executed synchronously
                if (executedErr)
                    throw executedErr;

                return result;

            } else { //callback was not executed synchronously, so it must be asynchronous
                return new Promise((...args2) => {
                    resolve = args2[0];
                    reject = args2[1];
                });
            }
        }

        //no callback, so either synchronous or returns a Promise
        switch (args.length) {
            case 0:
                return fn();

            case 1:
                return fn(args[0]);

            case 2:
                return fn(args[0], args[1]);

            default:
                throw new Error(`missing support for ${args.length} args`);
        }
    }

    static getElapsed(start) {
        const diff = process.hrtime(start);
        return Math.round(diff[0] * 1e3 + (diff[1] / 1e6));
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
                    const result = beforeEachHook.run(t);
                    this.emitAfter();
                    return result;
                }, this.suite[opts].timeout);
            }

            const start = process.hrtime();

            let p;
            try {
                this.emitBefore();
                p = Test.runAsync(this.action, t);
                // await promise.timeout(() => {
                //     return Promise.all([p, this.runPromises()]);
                // }, this.suite[opts].timeout);
            } finally {
                this.report.runTime = Test.getElapsed(start);
                this.emitAfter();
            }

            if (p instanceof Promise)
                await p;
        } catch (err) {
            if (this.failHandler) {
                try {
                    this.failHandler(err, t);
                } catch (err2) {
                    if (err instanceof promise.PromiseTimeoutError)
                        this.report.err = err;
                    else
                        this.report.err = err2;
                }

                return;
            }

            this.report.err = err;
        } finally {
            if (afterEachHook) {
                await promise.timeout(async () => {
                    this.emitBefore();
                    const result = afterEachHook.run(t, state);
                    this.emitAfter();
                    return result;
                }, this.suite[opts].timeout);
            }
        }
    }
};
