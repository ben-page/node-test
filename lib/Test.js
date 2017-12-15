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
            return false;

        if (this.failHandler) {
            try {
                this.failHandler(err);
            } catch (err2) {
                this.report.err = err2;
                return false;
            }

            return true;
        }

        this.report.err = err;
        return false;
    }

    async run(state) {
        try {
            await this.context.run(async () => {
                const start = process.hrtime();

                try {
                    await Test.runAsync(this.suite[shared.opts].timeout, this.action);
                } finally {
                    this.report.runTime = Test.getElapsed(start);
                }
            });
        } catch (err) {
            return this._handleError(err);
        } finally {
            this.end();
        }

        return true;
    }

    //fn() is executed synchronously. If it has an asynchronous callback, the callback will be promisified.
    static runAsync(timeout, fn, ...args) {
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
            const p = new Promise((...args2) => {
                resolve = args2[0];
                reject = args2[1];
            });
            if (timeout === -1)
                return p;
            return promise.timeout(() => p, timeout);
        }

        //no callback, so either synchronous or returns a Promise

        if (timeout === -1)
            return fn(...args);
        return promise.timeout(() => fn(...args), timeout);
    }

    static getElapsed(start) {
        const diff = process.hrtime(start);
        return Math.round(diff[0] * 1e3 + (diff[1] / 1e6));
    }
};
