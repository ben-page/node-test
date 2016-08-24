'use strict';
const Bluebird = require('bluebird');
const internalStackLine = /^(.*[\\\/]node-test[\\\/](lib|node_modules)[\\\/].*|[^\\\/]+)$/;
const previousHeading = 'Previous:';

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
                throw setStackTrace(new Error(`missing support for ${args.length} args`), stack);
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
            throw setStackTrace(new Error(`missing support for ${args.length} args`), stack);
    }
}

function runAsyncPromise(stack, fn, ...args) {
    if (fn === undefined)
        return Bluebird.resolve();
    
    if (fn.length > args.length + 1)
        throw setStackTrace(new Error(`expected expected ${args.length + 1} arguments, but ${fn.length} arguments were provided`), stack);
    
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
        throw setStackTrace(new Error(`expected expected ${args.length + 1} arguments, but ${fn.length} arguments were provided`), stack);
    
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

function getLineReader(string) {
    let start = 0,
        end = 0;
    
    return () => {
        end = string.indexOf('\n', start + 1);
        if (end === -1)
            return undefined;
        
        const value = string.substring(start, end);
        start = end + 1;
        return value;
    }
}

//todo: support spidermonkey and ie10

let parseStackTrace, getStackTrace;
//v8
if (Error.captureStackTrace) {
    const v8stackFramePattern = /^\s*at\s*/;
    
    parseStackTrace = (stack) => {
        const reader = getLineReader(stack);
        let foundStart = false;
        let message = '';
        const frames = [];
        
        for (let line = reader(); line; line = reader()) {
            if (!foundStart) {
                if (v8stackFramePattern.test(line)) {
                    foundStart = true;
                } else {
                    message += line;
                    continue;
                }
            }
            
            if (line === previousHeading || !internalStackLine.test(line))
                frames.push(line);
        }
        
        return {
            message: message,
            stack: frames.join('\n')
        };
    };
    
    getStackTrace = (stackStartFunction) => {
        const t = {};
        Error.captureStackTrace(t, stackStartFunction);
    
        const parsed = parseStackTrace(t.stack);
        
        return parsed.stack;
    };
}

function setStackTrace(err, ...traces) {
    const parsed = parseStackTrace(err.stack);
    
    if (traces.length > 0) {
        let stack = parsed.message;
    
        for (const trace of traces)
            stack += `\n${previousHeading}\n${trace}`;
        
        err.stack = stack;
    } else {
        const stack = `${parsed.message}\n${parsed.stack}`;
        err.stack = stack;
    }
    
    return err;
}

function concatStackTraces(err, ...traces) {
    const parsed = parseStackTrace(err.stack);
    
    let stack = `${parsed.message}\n${parsed.stack}`;
    
    for (const trace of traces)
        stack += `\n${previousHeading}\n${trace}`;
    
    err.stack = stack;
}

module.exports = {
    runAsync,
    runAsyncPromise,
    getElapsed,
    throwError,
    isPromise,
    getStackTrace,
    concatStackTraces
};