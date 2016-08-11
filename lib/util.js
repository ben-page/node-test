'use strict';
const Bluebird = require('bluebird');

function isPromise(obj) {
    if (!obj)
        return false;
    
    if (obj instanceof Promise || obj instanceof Bluebird)
        return true;
    
    return (typeof obj.then === 'function');
}

//fn() is executed synchronously. If it has an asynchronous callback, the callback will be promisified.
function doRunAsync(fn, ...args) {
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
            return new Bluebird((...args2) => {
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

function runAsyncPromise(fn, ...args) {
    if (fn === undefined)
        return Bluebird.resolve();
    
    if (fn.length > args.length + 1)
        throw new Error(`fn expects ${fn.length} arguments, but only ${args.length} arguments were provided`);
    
    try {
        return Bluebird.resolve(doRunAsync(fn, ...args));
    } catch (err) {
        return Bluebird.reject(err);
    }
}

function runAsync(fn, ...args) {
    if (fn === undefined)
        return undefined;
    
    if (fn.length > args.length + 1)
        throw new Error(`fn expects ${fn.length} arguments, but only ${args.length} arguments were provided`);
    
    return doRunAsync(fn, ...args);
}

function getElapsed(start) {
    const diff = process.hrtime(start);
    return Math.round(diff[0] * 1e3 + (diff[1] / 1e6));
}

module.exports = {
    runAsync,
    runAsyncPromise,
    getElapsed,
    isPromise
};