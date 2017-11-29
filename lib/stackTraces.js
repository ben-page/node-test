'use strict';
const async_hooks = require('async_hooks');
const fs = require('fs');
Error.stackTraceLimit = 99;

const asyncTraces = new Map();
const promiseLookup = new WeakMap();
const asyncHandlers = new Map();

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

/* async hook monitoring */
const asyncHook = async_hooks.createHook({
    init(asyncId, type, triggerAsyncId, resource) {
        const executionAsyncId = async_hooks.executionAsyncId();
        // fs.writeSync(1, `${type}(${asyncId}): trigger: ${triggerAsyncId} execution: ${executionAsyncId}\n`);

        const trace = getStackTrace();
        //store trace for this async id
        asyncTraces.set(asyncId, {
            parent: executionAsyncId,
            message: `Async call from ${type}:`,
            trace: trace,
            children: new Set()
        });

        //if parent exists, add this async resource as a child
        if (executionAsyncId > 1) {
            const parent = asyncTraces.get(executionAsyncId);
            parent.children.add(asyncId);
        }

        if (type === 'PROMISE')
            promiseLookup.set(resource.promise, asyncId);
    },
    // before(asyncId) {
    //     fs.writeSync(1, `before: ${asyncId}\n`);
    // },
    // after(asyncId) {
    //     fs.writeSync(1, `after: ${asyncId}\n`);
    // },
    destroy(asyncId) {
        // fs.writeSync(1, `destroy: ${asyncId}\n`);
        removeFromTraces(asyncId);
    },
    promiseResolve(asyncId) {
        // fs.writeSync(1, `promiseResolve: ${asyncId}\n`);
        removeFromTraces(asyncId);
    }
});

asyncHook.enable();

function removeFromTraces(asyncId) {
    const data = asyncTraces.get(asyncId);
    // asyncTraces.delete(asyncId);
    //remove async resource from parent
    if (data.parent > 1) {
        const parent = asyncTraces.get(data.parent);
        parent.children.delete(asyncId);
        //the parent has no outstanding async resources
        if (parent.children.size === 0) {
            const handler = asyncHandlers.get(data.parent);
            if (handler) {
                const endHandler = handler.end;
                process.nextTick(() => {
                    endHandler();
                });
            }
        }
    }
}

function appendTraces(asyncId, stack) {
    const entry = asyncTraces.get(asyncId);
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
function findErrorHandler(asyncId) {
    const handler = asyncHandlers.get(asyncId);
    if (handler)
        return handler.error;

    const entry = asyncTraces.get(asyncId);
    if (entry && entry.parent)
        return findErrorHandler(entry.parent);

    return undefined;
}

function raiseErrorHandler(asyncId, err, message) {
    let handler;
    if (asyncId) {
        setAsyncStackTrace(err, asyncId);
        handler = findErrorHandler(asyncId);
    }
    if (!handler) {
        fs.writeSync(2, `${message}:\n`);
        fs.writeSync(2, err.stack);
        process.exit(1);
        return;
    }

    handler(err);
}

process.on('uncaughtException', err => {
    // fs.writeSync(1, `uncaughtException trigger: ${async_hooks.triggerAsyncId()} execution: ${async_hooks.executionAsyncId()}\n`);
    const asyncId = async_hooks.executionAsyncId();
    raiseErrorHandler(asyncId, err, 'Uncaught Exception');
});

process.on('unhandledRejection', (err, promise) => {
    // fs.writeSync(1, `unhandledRejection trigger: ${async_hooks.triggerAsyncId()} execution: ${async_hooks.executionAsyncId()}\n`);
    const asyncId = promiseLookup.get(promise);
    raiseErrorHandler(asyncId, err, 'Unhandled Rejection');
});

module.exports = {
    setAsyncStackTrace() {
        setAsyncStackTrace();
    },
    showFullStackTrace() {
        showFullStackTrace = true;
    },
    register(asyncId, handler) {
        if (!handler || !handler.error || !handler.end)
            throw new Error('bad handler');
        asyncHandlers.set(asyncId, handler);
    },
    throwError(message) {
        const err = new Error(message);
        setAsyncStackTrace(err, async_hooks.executionAsyncId());
        throw err;
    }
};