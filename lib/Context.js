/* eslint-disable no-sync */
'use strict';
const asyncHooks = require('async_hooks');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

Error.stackTraceLimit = Number.POSITIVE_INFINITY;

const $stackFrames = Symbol('$stackFrames');
const $asyncId = Symbol('$asyncId');
const $message = Symbol('$message');
const $callEnd = Symbol('$callEnd');
const projectDir = path.resolve(__dirname, '../');

const traces = new Map();

const promises = new WeakMap(); //mapping of promise to asyncId that initialized the promise
const contexts = new Map(); //mapping of contexts to the asyncId of the async resource that created the context
const contextOperations = []; //queued context operations

let showFullStackTrace = false;
let disableAppend = false;
let contextInterval;

function captureStackFrames() {
    const t = {};
    disableAppend = true;
    Error.captureStackTrace(t);
    t.temp = t.stack; //trigger stackTraceCreation
    disableAppend = false;
    return t[$stackFrames];
}

function appendStackTraces(stackTraces, asyncId) {
    if (asyncId <= 1)
        return;

    const stackTrace = traces.get(asyncId);
    stackTraces.push(stackTrace);

    appendStackTraces(stackTraces, stackTrace.parent);
}

const asyncHook = asyncHooks.createHook({
    init(asyncId, type, triggerAsyncId, resource) {
        const executionAsyncId = asyncHooks.executionAsyncId();
        fs.writeSync(1, `${type}(${asyncId}): trigger: ${triggerAsyncId} execution: ${executionAsyncId}\n`);

        const trace = {
            parent: executionAsyncId,
            // message: `Async call from ${type}(${asyncId}):`,
            message: `Async call from ${type}:`,
            frames: captureStackFrames(),
            children: new Set(),
            active: true
        };
        traces.set(asyncId, trace);
        // fs.writeSync(1, `------${asyncId} start ------\n`);
        // fs.writeSync(1, `${printStackTrace([trace])}\n`);
        // fs.writeSync(1, `------${asyncId} end ------\n`);

        // fs.writeSync(1, `${makeChain(executionAsyncId)}${type}(${asyncId})\n`);

        if (executionAsyncId > 1) {
            const asyncTrace = traces.get(executionAsyncId);
            if (asyncTrace) {
                asyncTrace.children.add(asyncId);
                // fs.writeSync(1, `adding ${asyncId} to ${executionAsyncId}\n`);
            }
        }

        if (type === 'PROMISE')
            promises.set(resource.promise, asyncId);
    },
    before(asyncId) {
        fs.writeSync(1, `before: ${asyncId}\n`);
    },
    after(asyncId) {
        fs.writeSync(1, `after: ${asyncId}\n`);
    },
    destroy(asyncId) {
        fs.writeSync(1, `destroy: ${asyncId}\n`);
        cleanTraces(asyncId);
    },
    promiseResolve(asyncId) {
        // fs.writeSync(1, `promiseResolve: ${asyncId}\n`);
        // traces.delete(asyncId);
    }
});

function cleanTraces(asyncId) {
    // fs.writeSync(1, `delete: ${asyncId}\n`);
    const asyncTrace = traces.get(asyncId);
    if (asyncTrace === undefined)
        return;

    if (!asyncTrace.active && asyncTrace.children.size === 0)
        traces.delete(asyncId);

    asyncTrace.active = false;

    if (asyncTrace.parent <= 1)
        return;

    const parentAsyncTrace = traces.get(asyncTrace.parent);
    parentAsyncTrace.children.delete(asyncId);
    fs.writeSync(1, `removing ${asyncId} from ${asyncTrace.parent}\n`);
    //only delete trace when it has been destroyed and all of it's children have been destroyed
    if (parentAsyncTrace.children.size === 0) {
        const context = contexts.get(asyncTrace.parent);
        if (context)
            endContext(context);
        else if (!parentAsyncTrace.active)
            traces.delete(asyncTrace.parent);
    }
}

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

function printStackTrace(stackTraces) {
    const lines = [];
    for (const stackTrace of stackTraces) {
        const traceLines = [];
        for (const frame of stackTrace.frames) {
            if (includeFrame(frame))
                traceLines.push(`    at ${frame.toString()}`);
        }

        if (traceLines.length > 0) {
            if (lines.length === 0)
                lines.push(stackTrace.message);
            else
                lines.push(`- ${stackTrace.message}`);
            lines.push(...traceLines);
        }
    }

    return lines.join('\n');
}

Object.defineProperty(Error, 'prepareStackTrace', {
    value: function (error, frames) {
        error[$stackFrames] = frames;

        if (disableAppend)
            return undefined;

        const stackTraces = [
            {
                message: global.Error.prototype.toString.call(error),
                frames: frames
            }
        ];

        // fs.writeSync(1, `---prepareStackTrace - trigger: ${asyncHooks.triggerAsyncId()} execution: ${asyncHooks.executionAsyncId()}\n`);
        appendStackTraces(stackTraces, error[$asyncId] || asyncHooks.triggerAsyncId());

        return printStackTrace(stackTraces);
    }
});

const captureStackTrace = Error.captureStackTrace;
Object.defineProperty(Error, 'captureStackTrace', {
    value: function (error, stackStartFunction) {
        error[$asyncId] = asyncHooks.executionAsyncId();
        return captureStackTrace(error, stackStartFunction);
    }
});

Object.defineProperty(Error.prototype, 'message', {
    get: function () {
        return this[$message];
    },
    set: function (value) {
        this[$message] = value;
        this[$asyncId] = asyncHooks.executionAsyncId();
    }
});


function findContext(asyncId) {
    const context = contexts.get(asyncId);
    if (context)
        return context;

    const entry = traces.get(asyncId);
    if (entry && entry.parent)
        return findContext(entry.parent);

    return undefined;
}

function errorContext(context, err, type) {
    if (context.listenerCount('error') === 0) {
        raiseFatalError(err, type);
        return;
    }

    contextOperations.push(() => {
        context.emit('error', err, type);
    });
}

function raiseFatalError(err, message) {
    //if no context, emulate normal Node uncaught exception handling
    fs.writeSync(2, `${message}:\n`);
    fs.writeSync(2, err.stack);
    // eslint-disable-next-line no-process-exit
    process.exit(1);
}

process.on('uncaughtException', err => {
    // fs.writeSync(1, `uncaughtException trigger: ${asyncHooks.triggerAsyncId()} execution: ${asyncHooks.executionAsyncId()}\n`);
    // const asyncId = asyncHooks.triggerAsyncId();
    // err[$asyncId] = asyncId;
    const context = findContext(err[$asyncId]);

    if (context)
        errorContext(context, err, 'Uncaught Exception');
    else
        raiseFatalError(err, 'Uncaught Exception');
});

process.on('unhandledRejection', (err, promise) => {
    // fs.writeSync(1, `unhandledRejection trigger: ${async_hooks.triggerAsyncId()} execution: ${async_hooks.executionAsyncId()}\n`);
    // const asyncId = promises.get(promise);
    // err[$asyncId] = asyncId;
    const context = findContext(err[$asyncId]);

    if (context)
        errorContext(context, err, 'Unhandled Rejection');
    else
        raiseFatalError(err, 'Unhandled Rejection');
});

function endContext(context) {
    contextOperations.push(() => {
        context[$callEnd]();
    });
}

function checkContextInterval(context) {
    if (contexts.has(context.asyncId()))
        throw new Error('Context may only execute');

    contexts.set(context.asyncId(), context);

    if (!contextInterval) {
        contextInterval = setInterval(() => {
            while(contextOperations.length > 0) {
                const call = contextOperations.shift();
                call();
            }

            if (contexts.size === 0) {
                clearInterval(contextInterval);
                contextInterval = undefined;
            }
        }, 100);
    }
}

class Context extends asyncHooks.AsyncResource {
    constructor(type, triggerAsyncId) {
        super(type, triggerAsyncId);
        EventEmitter.call(this);
        checkContextInterval(this);
    }

    run(fn) {
        const endPromise = new Promise((...args) => {
            this[$callEnd] = () => {
                args[0]();
            };
        });

        let resolve, reject;
        const workPromise = new Promise((...args) => {
            resolve = args[0];
            reject = args[1];
        });

        this.emitBefore();
        try {
            const result = fn();
            resolve(result);
        } catch (err) {
            reject(err);
        } finally {
            this.emitAfter();
        }

        return Promise.all([workPromise, endPromise])
            .then(() => {
                contexts.delete(this.asyncId());
                this.emitDestroy();
            });
    }

    static showFullStackTrace() {
        showFullStackTrace = true;
    }

}

Object.assign(Context.prototype, EventEmitter.prototype);

// //proxy Error object to apply async stack trace
// global.Error = (function () {
//     return class Error extends global.Error {
//         constructor(...args) {
//             super(...args);
//             // fs.writeSync(1, `---Error trigger: ${asyncHooks.triggerAsyncId()} execution: ${asyncHooks.executionAsyncId()}\n`);
//             this[$asyncId] = asyncHooks.executionAsyncId();
//         }
//     };
// })();

module.exports = Context;
