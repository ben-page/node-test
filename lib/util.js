'use strict';
function isPromise(obj) {
    if (!obj)
        return false;
    
    if (obj instanceof Promise)
        return true;
    
    return (typeof obj.then === 'function');
}

//fn() is executed synchronously. If it has an asynchronous callback, the callback will be promisified.
function doRunAsync(stackTrace, fn, ...args) {
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
                throw setStackTrace(new Error(`missing support for ${args.length} args`), stackTrace);
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
            throw setStackTrace(new Error(`missing support for ${args.length} args`), stackTrace);
    }
}

async function runAsync(stackTrace, fn, ...args) {
    if (fn === undefined)
        return undefined;
    
    if (fn.length > args.length + 1)
        throw setStackTrace(new Error(`expected expected ${args.length + 1} arguments, but ${fn.length} arguments were provided`), stackTrace);
    
    return doRunAsync(stackTrace, fn, ...args);
}

function getElapsed(start) {
    const diff = process.hrtime(start);
    return Math.round(diff[0] * 1e3 + (diff[1] / 1e6));
}

module.exports = {
    runAsync,
    getElapsed,
    throwError,
    isPromise
};