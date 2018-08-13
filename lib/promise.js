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
        if (!(promise instanceof Promise))
            throw new Error('expected a Promise');

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

    timeout(promise, ms, constructorOpt) {
        if (!(promise instanceof Promise))
            throw new Error('expected a Promise');

        const timeoutError = new PromiseTimeoutError();
        Error.captureStackTrace(timeoutError, constructorOpt);

        const p = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(timeoutError);
            }, ms);

            promise
                .then(result => {
                    clearTimeout(timeout);
                    resolve(result);
                }, err => {
                    clearTimeout(timeout);
                    reject(err);
                });
        });
        p._a = 123;
        return p;
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
