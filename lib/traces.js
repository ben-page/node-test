/* eslint-disable no-sync */
'use strict';
const asyncHooks = require('async_hooks');
const fs = require('fs');
const path = require('path');

Error.stackTraceLimit = Number.POSITIVE_INFINITY;

const $frames = Symbol('$frames');
const $asyncId = Symbol('$asyncId');
const projectDir = path.resolve(__dirname, '../');

const traces = new Map();
const promises = new WeakMap();

let showFullStackTrace = false;
let isInternalCall = false;

function captureStackFrames() {
    const t = {};
    isInternalCall = true;
    Error.captureStackTrace(t);
    t.temp = t.stack; //trigger prepareStackTrace
    isInternalCall = false;
    return t[$frames];
}

const asyncHook = asyncHooks.createHook({
    init(asyncId, type, triggerAsyncId, resource) {
        const executionAsyncId = asyncHooks.executionAsyncId();
        // fs.writeSync(1, `${type}(${asyncId}): trigger: ${triggerAsyncId} execution: ${executionAsyncId}\n`);

        const trace = {
            // message: `Async call from ${type}(${asyncId}):`,
            message: `Async call from ${type}:`,
            frames: captureStackFrames(),
            parent: traces.get(executionAsyncId)
        };
        traces.set(asyncId, trace);

        if (type === 'PROMISE')
            promises.set(resource.promise, asyncId);
    },
    before(asyncId) {
        // fs.writeSync(1, `before: ${asyncId}\n`);
    },
    after(asyncId) {
        // fs.writeSync(1, `after: ${asyncId}\n`);
    },
    destroy(asyncId) {
        // fs.writeSync(1, `destroy: ${asyncId}\n`);
        traces.delete(asyncId);
    },
    promiseResolve(asyncId) {
        // fs.writeSync(1, `promiseResolve: ${asyncId}\n`);
        traces.delete(asyncId);
    }
});

asyncHook.enable();

function includeFrame(frame) {
    if (showFullStackTrace)
        return true;

    const fileName = frame.getFileName();
    if (!fileName)
        return false;

    const dirName = path.dirname(fileName);
    if (dirName === '.' || dirName.startsWith('internal'))
        return false;

    const relativePath = path.relative(projectDir, dirName);
    return !relativePath.startsWith('lib');
}

function printStackTrace(trace) {
    const lines = [];
    while (trace) {
        const traceLines = [];
        for (const frame of trace.frames) {
            if (includeFrame(frame))
                traceLines.push(`    at ${frame.toString()}`);
        }

        if (traceLines.length > 0) {
            if (lines.length === 0)
                lines.push(trace.message);
            else
                lines.push(`- ${trace.message}`);
            lines.push(...traceLines);
        }

        trace = trace.parent;
    }

    return lines.join('\n');
}

Object.defineProperty(Error, 'prepareStackTrace', {
    value: function (error, frames) {
        error[$frames] = frames;

        if (isInternalCall)
            return undefined;

        const trace = {
            message: global.Error.prototype.toString.call(error),
            frames,
            parent: traces.get(error[$asyncId])
        };

        // fs.writeSync(1, `---prepareStackTrace - trigger: ${asyncHooks.triggerAsyncId()} execution: ${asyncHooks.executionAsyncId()}\n`);

        return printStackTrace(trace);
    }
});

const captureStackTrace = Error.captureStackTrace;
Object.defineProperty(Error, 'captureStackTrace', {
    value: function (error, stackStartFunction) {
        if (!error[$asyncId])
            error[$asyncId] = asyncHooks.executionAsyncId();
        return captureStackTrace(error, stackStartFunction);
    }
});

//proxy Error object to apply async stack trace
global.Error = (function () {
    return class Error extends global.Error {
        constructor(...args) {
            super(...args);
            // fs.writeSync(1, `---Error trigger: ${asyncHooks.triggerAsyncId()} execution: ${asyncHooks.executionAsyncId()}\n`);
            this[$asyncId] = asyncHooks.executionAsyncId();
        }
    };
})();

process.prependListener('uncaughtException', err => {
    // fs.writeSync(1, `uncaughtException trigger: ${asyncHooks.triggerAsyncId()} execution: ${asyncHooks.executionAsyncId()}\n`);
    if (!err[$asyncId])
        err[$asyncId] = asyncHooks.triggerAsyncId();

    if (process.listenerCount('uncaughtException') === 1) {
        fs.writeSync(2, `Uncaught Exception ${err.stack}`);
        // eslint-disable-next-line no-process-exit
        process.exit(1);
    }
});

process.prependListener('unhandledRejection', (err, promise) => {
    // fs.writeSync(1, `unhandledRejection trigger: ${async_hooks.triggerAsyncId()} execution: ${async_hooks.executionAsyncId()}\n`);
    if (!err[$asyncId])
        err[$asyncId] = promises.get(promise);

    if (process.listenerCount('unhandledRejection') === 1) {
        fs.writeSync(2, `Unhandled Rejection ${err.stack}`);
        // eslint-disable-next-line no-process-exit
        process.exit(1);
    }
});

module.exports = function () {
    showFullStackTrace = true;
};
