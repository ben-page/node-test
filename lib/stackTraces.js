'use strict';
const async_hooks = require('async_hooks');
const fs = require('fs');
Error.stackTraceLimit = 99;

/* stack trace parsing */
const internalStackLine = /^.*?\((.*[\\\/]node-test[\\\/](lib|node_modules)[\\\/].*|[^\\\/]+|internal[\\\/].*)\)$/;

let showFullStackTrace = false;

function* getLineIterator(string) {
    for (let start = 0, end = string.indexOf('\n'); end > -1; end = string.indexOf('\n', start + 1)) {
        yield string.substring(start, end);
        start = end + 1;
    }
}

//todo: support spidermonkey and ie10

let parseStackTrace, getStackTrace;
//v8
if (Error.captureStackTrace) {
    const v8stackFramePattern = /^\s*at\s*/;

    parseStackTrace = (stack) => {
        let foundStart = false;
        let message = '';
        let frames = [];

        for (const line of getLineIterator(stack)) {
            if (!foundStart) {
                if (v8stackFramePattern.test(line)) {
                    foundStart = true;
                } else {
                    message += line;
                    continue;
                }
            }

            if (showFullStackTrace || !internalStackLine.test(line))
                frames.push(line);
        }

        return {
            message: message,
            trace: frames.join('\n')
        };
    };

    getStackTrace = (stackStartFunction) => {
        const t = {};
        Error.captureStackTrace(t, stackStartFunction);

        const parsed = parseStackTrace(t.stack);

        return parsed.trace;
    };
}

/* async hook monitoing */
const stackTraces = {};
const promiseLookup = new WeakMap();

const asyncHook = async_hooks.createHook({
    init(asyncId, type, triggerAsyncId, resource) {
        const eid = async_hooks.executionAsyncId();
        // fs.writeSync(1, `${type}(${asyncId}): trigger: ${triggerAsyncId} execution: ${eid}\n`);
        // fs.writeSync(1, `${resource.constructor.name}\n`);

        const trace = getStackTrace();
        stackTraces[asyncId] = {
            parent: eid,
            message: `Async call from ${type}:`,
            trace: trace
        };

        if (type === 'PROMISE')
            promiseLookup.set(resource.promise, asyncId);
    },
    // before(asyncId) {
    //     current = asyncId;
    //     // fs.writeSync(1, `before: ${asyncId}\n`);
    // },
    // after(asyncId) {
    //     // current = asyncId;
    //     indent -= 2;
    //     const indentStr = ' '.repeat(indent);
    //     fs.writeSync(1, `${indentStr}after:   ${asyncId}\n`);
    // },
    // destroy(asyncId) {
    //     // const indentStr = ' '.repeat(indent);
    //     // fs.writeSync(1, `${indentStr}destroy: ${asyncId}\n`);
    // }
    promiseResolve(asyncId, promise) {
        // promiseLookup.set(promise, asyncId);
    }
});

asyncHook.enable();

function appendTraces(asyncId, stack) {
    const entry = stackTraces[asyncId];
    if (entry.trace) {
        stack.push(entry.message);
        stack.push(entry.trace);
    }
    if (entry.parent > 1)
        appendTraces(entry.parent, stack);
}

function setAsyncStackTrace(err, asyncId) {
    const stack =  [];
    const entry = parseStackTrace(err.stack);
    if (entry.trace) {
        stack.push(entry.message);
        stack.push(entry.trace);
    }

    appendTraces(asyncId, stack);
    err.stack = stack.join('\n')+ '\n';
}

/* uncaught exceptions */

const uncaughtHandlers = {};

function findErrorHandler(asyncId) {
    const handler = uncaughtHandlers[asyncId];
    if (handler)
        return handler;

    const entry = stackTraces[asyncId];
    if (entry && entry.parent)
        return findErrorHandler(entry.parent);

    return undefined;
}

process.on('uncaughtException', err => {
    const asyncId = async_hooks.executionAsyncId();
    setAsyncStackTrace(err, asyncId);
    const handler = findErrorHandler(asyncId);
    if (!handler) {
        fs.writeSync(2,'Uncaught Exception:\n');
        fs.writeSync(2, err.stack);
        process.exit(1);
        return;
    }

    handler(err);
});

process.on('unhandledRejection', (err, promise) => {
    const asyncId = promiseLookup.get(promise);
    let handler;
    if (asyncId) {
        setAsyncStackTrace(err, asyncId);
        handler = findErrorHandler(asyncId);
    }
    if (!handler) {
        fs.writeSync(2,'Unhandled Rejection:\n');
        fs.writeSync(2, err.stack);
        process.exit(1);
        return;
    }

    handler(err);
});

module.exports = {
    setAsyncStackTrace() {
        setAsyncStackTrace();
    },
    showFullStackTrace() {
        showFullStackTrace = true;
    },
    register(handler) {
        uncaughtHandlers[async_hooks.executionAsyncId()] = handler;
    },
    throwError(message) {
        const err = new Error(message);
        setAsyncStackTrace(err, async_hooks.executionAsyncId());
        throw err;
    }
};