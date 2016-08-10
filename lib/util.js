'use strict';
const Bluebird = require('bluebird');

function isPromise(obj) {
    if (!obj)
        return false;
    
    if (obj instanceof Promise || obj instanceof Bluebird)
        return true;
    
    return (typeof obj.then === 'function');
}

//This will handle fn synchronously if at all possible. It will only revert to asynchronous execution if necessary.
// It's necessary only if fn() returns a Promise or the callback is not executed synchronously.
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
                reject = args2[0];
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
        return Bluebird.resolve();
    
    if (fn.length > args.length + 1)
        throw new Error(`fn expects ${fn.length} arguments, but only ${args.length} arguments were provided`);
    
    return doRunAsync(fn, ...args);
}

module.exports = {
    runAsync,
    runAsyncPromise,
    isPromise
};