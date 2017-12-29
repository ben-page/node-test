'use strict';
// const $reject = Symbol('reject');

class PromiseTimeoutError extends Error {
    constructor() {
        super();
        this.name = this.constructor.name;
    }
}

class PromiseCancellationError extends Error {
    constructor() {
        super();
        this.name = this.constructor.name;
    }
}

module.exports = {
    delay(ms) {
        return new Promise(resolve => {
            setTimeout(resolve, ms);
        });
    },

    PromiseTimeoutError,

    PromiseCancellationError,

    cancelable(promise, constructorOpt) {
        const cancelError = new PromiseCancellationError();
        Error.captureStackTrace(cancelError, constructorOpt);

        let cancel;
        const p = new Promise((resolve, reject) => {
            promise.then(resolve, reject);
            cancel = () => reject(cancelError);
        });
        p.cancel = () => cancel();
        return p;
    },

    timeout(arg1, ms, constructorOpt) {
        const timeoutError = new PromiseTimeoutError();
        Error.captureStackTrace(timeoutError, constructorOpt);

        let fn;
        if (typeof arg1 === 'function')
            fn = arg1;
        else if (arg1 instanceof Promise)
            fn = () => arg1;
        else
            throw new Error('arg1 should be a Function or a Promise');

        return new Promise(async (resolve, reject) => {
            let result;

            const timeout = setTimeout(() => {
                reject(timeoutError);
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
