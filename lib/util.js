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
function doRunAsync(stack, fn, ...args) {
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
                throw setOptionalStack(new Error(`missing support for ${args.length} args`), stack);
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
            throw setOptionalStack(new Error(`missing support for ${args.length} args`), stack);
    }
}

function runAsyncPromise(stack, fn, ...args) {
    if (fn === undefined)
        return Bluebird.resolve();
    
    if (fn.length > args.length + 1)
        throw setOptionalStack(new Error(`expected expected ${args.length + 1} arguments, but ${fn.length} arguments were provided`), stack);
    
    try {
        return Bluebird.resolve(doRunAsync(stack, fn, ...args));
    } catch (err) {
        return Bluebird.reject(err);
    }
}

function runAsync(stack, fn, ...args) {
    if (fn === undefined)
        return undefined;
    
    if (fn.length > args.length + 1)
        throw setOptionalStack(new Error(`expected expected ${args.length + 1} arguments, but ${fn.length} arguments were provided`), stack);
    
    return doRunAsync(fn, ...args);
}

function getElapsed(start) {
    const diff = process.hrtime(start);
    return Math.round(diff[0] * 1e3 + (diff[1] / 1e6));
}

function throwError(message, stackStartFunction) {
    if (!stackStartFunction)
        throw new Error('stackStartFunction is required');
    
    const err = new Error(message);
    if (Error.captureStackTrace)
        Error.captureStackTrace(err, stackStartFunction);
    throw err;
}

//todo: support spidermonkey and ie10

let getStackTrace, getErrorHeader;
//v8
if (Error.captureStackTrace) {
    const v8stackFramePattern = /^\s*at\s*/;
    
    getStackTrace = (stackStartFunction) => {
        const t = {};
        Error.captureStackTrace(t, stackStartFunction);
        
        const stack = t.stack;
        const reader = getLineReader(stack);
        for (let line = reader(); line; line = reader()) {
            if (v8stackFramePattern.test(line.value))
                return stack.substring(line.start);
        }
        return 'invalid stack';
    };
    
    getErrorHeader = (err) => {
        const stack = err.stack;
        const reader = getLineReader(stack);
        for (let line = reader(); line; line = reader()) {
            if (v8stackFramePattern.test(line.value))
                return stack.substring(0, line.start - 1);
        }
        return stack;
    }
}

function setOptionalStack(err, ...frames) {
    if (frames.length > 0) {
        let stack = getErrorHeader(err) + '\n';
        for (let i = 0; i < frames.length; i++) {
            if (i !== 0)
                stack += '\nPrevious:\n';
            stack += frames[i];
        }
        err.stack = stack;
    }
    
    return err;
}

function addErrorFrames(err, ...frames) {
    let stack = err.stack;
    for (const frame of frames)
        stack += '\nPrevious\n' + frame;
    
    err.stack = stack;
}

function getLineReader(string) {
    let start = 0,
        end = 0;

    return () => {
        end = string.indexOf('\n', start + 1);
        if (end === -1)
            return undefined;

        const value = {
            value: string.substring(start, end + 1),
            start,
            end
        };
        start = end + 1;
        return value;
    }
}

module.exports = {
    runAsync,
    runAsyncPromise,
    getElapsed,
    throwError,
    isPromise,
    getStackTrace,
    addErrorFrames
};