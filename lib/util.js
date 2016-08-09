'use strict';
const Bluebird = require('bluebird');

function isPromise(obj) {
    if (!obj)
        return false;
    
    if (obj instanceof Promise || obj instanceof Bluebird)
        return true;
    
    return (typeof obj.then === 'function');
}

function runAsync(fn, ...args) {
    if (fn === undefined)
        return Bluebird.resolve(undefined);
    
    if (fn.length > args.length + 1)
        throw new Error(`fn expects ${fn.length} arguments, but only ${args.length} arguments were provided`);
    
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
            
        switch (args.length) {
            case 1:
                try {
                    fn(args[0], callback);
                } catch (err) {
                    return Bluebird.reject(err);
                }
                break;
            
            case 2:
                try {
                    fn(args[0], args[1], callback);
                } catch (err) {
                    return Bluebird.reject(err);
                }
                break;
            
            default:
                throw new Error(`missing support for ${args.length} args`);
        }
    
        if (executed) { //callback was executed synchronously
            if (executedErr)
                return Bluebird.reject(executedErr);
        
        } else { //callback was not executed synchronously, so it must be asynchronous
            return new Bluebird((...args2) => {
                resolve = args2[0];
                reject = args2[0];
            });
        }
    }
    
    //no callback, so either synchronous or returns a Promise
    switch (args.length) {
        case 1:
            try {
                return Bluebird.resolve(fn(args[0]));
            } catch (err) {
                return Bluebird.reject(err);
            }
        
        case 2:
            try {
                return Bluebird.resolve(fn(args[0], args[1]));
            } catch (err) {
                return Bluebird.reject(err);
            }
        
        default:
            throw new Error(`missing support for ${args.length} args`);
    }
}

module.exports = {
    runAsync,
    isPromise
};