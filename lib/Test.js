'use strict';
const shared = require('./shared');
const promise = require('./promise');
const Context = require('./Context');

const report = shared.report;
const runner = shared.runner;

module.exports = class Test {
    constructor(suite, name, action, failHandler, options) {

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
        this.context = new Context('node-test.Test');
        this.context.on('error', err => {
            this._handleError(err);
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
    }

    _handleError(err) {
        if (this.report.status)
            return;
        if (this.failHandler) {
            try {
                this.failHandler(err);
            } catch (err2) {
                this.report.err = err2;
            }

            return;
        }

        this.report.err = err;
    }

    async run(state) {
        try {
            await this.context.run(async () => {
                const f = await this.run2(state);
                return f;
            });
        } catch (err) {
            this._handleError(err);
        } finally {
            this.end();
        }
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

            //callback was executed synchronously
            if (executed) {
                if (executedErr)
                    throw executedErr;

                return result;

            }

            //callback was not executed synchronously, so it must be asynchronous
            return new Promise((...args2) => {
                resolve = args2[0];
                reject = args2[1];
            });
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

    async run2(state) {
        try {
            const start = process.hrtime();

            let p;
            try {
                p = Test.runAsync(this.action);
                // await promise.timeout(() => {
                //     return Promise.all([p, this.runPromises()]);
                // }, this.suite[opts].timeout);
            } finally {
                this.report.runTime = Test.getElapsed(start);
            }

            if (p instanceof Promise)
                await p;
        } catch (err) {
            this._handleError(err);
        }
    }
};
