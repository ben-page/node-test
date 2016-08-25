'use strict';
const Bluebird = require('bluebird');
const internalStackLine = /^(.*[\\\/]node-test[\\\/](lib|node_modules)[\\\/].*|[^\\\/]+)$/;
const previousHeading = 'From previous event:';

function isPromise(obj) {
    if (!obj)
        return false;
    
    if (obj instanceof Promise || obj instanceof Bluebird)
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
            throw setStackTrace(new Error(`missing support for ${args.length} args`), stackTrace);
    }
}

function runAsyncPromise(stackTrace, fn, ...args) {
    if (fn === undefined)
        return Bluebird.resolve();
    
    if (fn.length > args.length + 1)
        throw setStackTrace(new Error(`expected expected ${args.length + 1} arguments, but ${fn.length} arguments were provided`), stackTrace);
    
    try {
        return Bluebird.resolve(doRunAsync(stackTrace, fn, ...args));
    } catch (err) {
        return Bluebird.reject(err);
    }
}

function runAsync(stackTrace, fn, ...args) {
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
        const traces = [];
        let frames = [];
        
        for (let line = reader(); line; line = reader()) {
            if (!foundStart) {
                if (v8stackFramePattern.test(line)) {
                    foundStart = true;
                } else {
                    message += line;
                    continue;
                }
            }
            
            if (line === previousHeading) {
                if (frames.length > 0) {
                    traces.push(frames.join('\n'));
                    frames = [];
                }
            } else if (!internalStackLine.test(line)) {
                frames.push(line);
            }
        }
        if (frames.length > 0)
            traces.push(frames.join('\n'));
        
        return {
            message: message,
            traces: traces
        };
    };
    
    getStackTrace = (stackStartFunction) => {
        const t = {};
        Error.captureStackTrace(t, stackStartFunction);
    
        const parsed = parseStackTrace(t.stack);
        
        return parsed.traces.slice(0, 1);
    };
}

function setStackTrace(err, ...traces) {
    const parsed = parseStackTrace(err.stack);
    
    err.stack = buildStack(parsed.message, traces.length > 0 ? traces : parsed.traces);
    
    return err;
}

function concatStackTraces(err, ...calls) {
    const parsed = parseStackTrace(err.stack);
    
    let traces = parsed.traces;
    for (const call of calls)
        traces = cleanOverlapping(traces, call);
    err.stack = buildStack(parsed.message, traces);
    
    return err;
}

function buildStack(message, traces) {
    let stack = message;
    for (let i = 0; i < traces.length; i++) {
        const trace = traces[i];
        if (i === 0)
            stack += `\n${trace}`;
        else
            stack += `\n${previousHeading}\n${trace}`;
    }
    
    return stack;
}

//clean up overlapping traces caused by bluebird and node-test tracking long stack traces
function cleanOverlapping(a1, a2) {
    for (let i2 = 0; i2 < a2.length; i2++) {
        const start = Math.max(0, a1.length - a2.length + i2);
        
        let i1 = a1.indexOf(a2[i2], start);
        if (i1 > -1) {
            let j2 = i2;
            
            while (a2[j2] === a1[i1]) {
                j2++;
                if (++i1 >= a1.length)
                    return a1.concat(a2.slice(j2));
            }
        }
    }
    
    return a1.concat(a2);
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