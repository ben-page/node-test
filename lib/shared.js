'use strict';
const promise = require('./promise.js');

module.exports = {
    report: Symbol('$report'),
    beforeEach: Symbol('$beforeEach'),
    afterEach: Symbol('$afterEach'),
    opts: Symbol('$options'),
    run: Symbol('$run'),
    runner: Symbol('$runner'),

    updateErrorMessage(err, message) {
        err.message = message;
        const i = err.stack.indexOf('\n');
        if (i > -1) {
            if (err.stack.substring(0, i - 1) !== message)
                err.stack = message + err.stack.substring(i);
        }
    },

    //fn() is executed synchronously. If it has an asynchronous callback, the callback will be promisified.
    runFn(timeout, fn, ...args) {
        if (fn === undefined)
            return undefined;

        if (fn.length > args.length + 1)
            throw new Error(`expected expected ${args.length + 1} arguments, but ${fn.length} arguments were provided`);

        //no callback, so either synchronous or returns a Promise
        if (fn.length !== args.length + 1) {
            const result = fn(...args);
            if (timeout > 0 && result instanceof Promise)
                return promise.timeout(result, timeout);

            return result;
        }

        //expects callback
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

        const result = fn(...args, callback);

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
        return promise.timeout(p, timeout);
    }
};
