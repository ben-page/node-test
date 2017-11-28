'use strict';
class PromiseTimeoutError extends Error {
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

    timeout(arg1, ms, constructorOpt) {
        let captureError;
        if (Error.captureStackTrace) {
            captureError = new PromiseTimeoutError();
            Error.captureStackTrace(captureError, constructorOpt);
        }

        let fn;
        if (typeof arg1 === 'function') {
            fn = arg1;
        } else if (fn instanceof Promise) {
            fn = () => arg1;
        } else {
            throw new Error('arg1 should be a Function or a Promise');
        }

        return new Promise(async (resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(captureError || new PromiseTimeoutError());
            }, ms);

            try {
                const result = await fn();
                resolve(result);
            } catch (err) {
                reject(err);
            } finally {
                clearTimeout(timeout);
            }
        })
    },

    async map(array, fn) {
        const promises = [];
        let results = [];

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
        let results = [];

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
