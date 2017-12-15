'use strict';
// const $reject = Symbol('reject');

class PromiseTimeoutError extends Error {
    constructor() {
        super();
        this.name = this.constructor.name;
    }
}

// class PromiseCancellationError extends Error {
//     constructor() {
//         super();
//         this.name = this.constructor.name;
//     }
// }

// global.Promise = (function () {
//     return class Promise extends global.Promise {
//         constructor(fn) {
//             let reject;
//             const fn2 = function (res, rej) {
//                 reject = rej;
//                 fn(res, rej);
//             };
//             super(fn2);
//             this[$reject] = reject;
//         }
//
//         cancel() {
//             const err = new PromiseCancellationError();
//             if (Error.captureStackTrace)
//                 Error.captureStackTrace(err, Promise.cancel);
//             this[$reject](err);
//         }
//     };
// })();

// const promiseReject = process.binding('util').promiseReject;
// function rejectChain(p, err) {
//     promiseReject(p, err);
// }

module.exports = {
    delay(ms) {
        return new Promise(resolve => {
            setTimeout(resolve, ms);
        });
    },

    PromiseTimeoutError,

    timeout(arg1, ms, constructorOpt) {
        let timeoutError;
        // let timeoutError, cancelError;
        if (Error.captureStackTrace) {
            timeoutError = new PromiseTimeoutError();
            // cancelError = new PromiseCancellationError();
            Error.captureStackTrace(timeoutError, constructorOpt);
            // Error.captureStackTrace(cancelError, constructorOpt);
        }

        let fn;
        if (typeof arg1 === 'function')
            fn = arg1;
        else if (fn instanceof Promise)
            fn = () => arg1;
        else
            throw new Error('arg1 should be a Function or a Promise');

        return new Promise(async (resolve, reject) => {
            let result;

            const timeout = setTimeout(() => {
                reject(timeoutError || new PromiseTimeoutError());
                // if (result instanceof Promise)
                //     rejectChain(result, cancelError);
            }, ms);

            try {
                result = fn();
                await result;
                resolve(result);
            } catch (err) {
                reject(err);
            } finally {
                clearTimeout(timeout);
            }
        });
    },

    async map(array, fn) {
        const promises = [];
        const results = [];

        for (let i = 0; i < array.length; i++) {
            const p = (async () => {
                const item = array[i];
                results[i] = await fn.call(item, item, i);
            })();
            promises.push(p);
        }

        await Promise.all(promises);
        return results;
    },

    async mapSeries(array, fn) {
        const promises = [];
        const results = [];

        for (let i = 0; i < array.length; i++) {
            const item = array[i];
            results[i] = await fn.call(item, item, i);
        }

        await Promise.all(promises);
        return results;
    },

    async each(array, fn) {
        for (let i = 0; i < array.length; i++) {
            const item = array[i];
            await fn.call(item, item, i, array);
        }
    }
};
