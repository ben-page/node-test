/* eslint-disable no-sync */
'use strict';
const asyncHooks = require('async_hooks');
const fs = require('fs');
const EventEmitter = require('events');
const stackUtil = require('./stackUtil');
const assert = require('assert');
// const errors = require('internal/errors');

Error.stackTraceLimit = 50;

let showFullStackTrace = false;

const asyncTraces = new Map(); //stack traces for each async resource
const promises = new WeakMap(); //mapping of promise to asyncId that initialized the promise
const contexts = new Map(); //mapping of contexts to the asyncId of the async resource that created the context
const contextOperations = []; //queued context operations

const callEnd = Symbol('callEnd');

let contextInterval;

//proxy Error object to apply async stack trace
global.Error = (function () {
    return class Error extends global.Error {
        constructor(...args) {
            super(...args);
            setAsyncStackTrace(this, asyncHooks.executionAsyncId());
        }
    };
})();

assert.AssertionError = (function () {
    return class AssertionError extends assert.AssertionError {
        constructor(...args) {
            super(...args);
            setAsyncStackTrace(this, asyncHooks.executionAsyncId());
        }
    };
})();

global.TypeError = (function () {
    return class TypeError extends global.TypeError {
        constructor(...args) {
            super(...args);
            setAsyncStackTrace(this, asyncHooks.executionAsyncId());
        }
    };
})();

global.RangeError = (function () {
    return class RangeError extends global.RangeError {
        constructor(...args) {
            super(...args);
            setAsyncStackTrace(this, asyncHooks.executionAsyncId());
        }
    };
})();

global.URIError = (function () {
    return class URIError extends global.URIError {
        constructor(...args) {
            super(...args);
            setAsyncStackTrace(this, asyncHooks.executionAsyncId());
        }
    };
})();

// function makeChain(asyncId) {
//     let chain = '';
//     while (asyncId && asyncId > 1) {
//         chain = `${asyncId}>${chain}`;
//         try {
//             asyncId = asyncTraces.get(asyncId).parent;
//         } catch (err) {
//             fs.writeSync(1, `error on ${asyncId}\n`);
//             throw err;
//         }
//     }
//     return chain;
// }

const asyncHook = asyncHooks.createHook({
    init(asyncId, type, triggerAsyncId, resource) {
        const executionAsyncId = asyncHooks.executionAsyncId();
        // fs.writeSync(1, `${type}(${asyncId}): trigger: ${triggerAsyncId} execution: ${executionAsyncId}\n`);

        //store trace for this async id
        asyncTraces.set(asyncId, {
            parent: executionAsyncId,
            message: `Async call from ${type}(${asyncId}):`,
            trace: stackUtil.createStackTrace(undefined, showFullStackTrace),
            children: new Set(),
            active: true
        });

        // fs.writeSync(1, `${makeChain(executionAsyncId)}${type}(${asyncId})\n`);

        if (executionAsyncId > 1) {
            const asyncTrace = asyncTraces.get(executionAsyncId);
            if (asyncTrace) {
                asyncTrace.children.add(asyncId);
                // fs.writeSync(1, `adding ${asyncId} to ${executionAsyncId}\n`);
            }
        }

        if (type === 'PROMISE')
            promises.set(resource.promise, asyncId);
    },
    // before(asyncId) {
    //     fs.writeSync(1, `before: ${asyncId}\n`);
    // },
    // after(asyncId) {
    //     fs.writeSync(1, `after: ${asyncId}\n`);
    // },
    destroy(asyncId) {
        // fs.writeSync(1, `destroy: ${asyncId}\n`);
        // fs.writeSync(1, `destroy: ${makeChain(asyncId)}\n`);
        cleanTraces(asyncId);
    },
    promiseResolve(asyncId) {
        // fs.writeSync(1, `promiseResolve: ${asyncId}\n`);
        // fs.writeSync(1, `promiseResolve: ${makeChain(asyncId)}\n`);
        cleanTraces(asyncId);
    }
});

asyncHook.enable();

function cleanTraces(asyncId) {
    // fs.writeSync(1, `delete: ${asyncId}\n`);
    const asyncTrace = asyncTraces.get(asyncId);
    if (!asyncTrace.active && asyncTrace.children.size === 0) {
        asyncTraces.delete(asyncId);
    }
    asyncTrace.active = false;

    if (asyncTrace.parent <= 1)
        return;

    const parentAsyncTrace = asyncTraces.get(asyncTrace.parent);
    parentAsyncTrace.children.delete(asyncId);
    // fs.writeSync(1, `removing ${asyncId} from ${asyncTrace.parent}\n`);
    //only delete trace when it has been destroyed and all of it's children have been destroyed
    if (parentAsyncTrace.children.size === 0) {
        const context = contexts.get(asyncTrace.parent);
        if (context)
            endContext(context);
        else if (!parentAsyncTrace.active)
            asyncTraces.delete(asyncTrace.parent);
    }
}

/**
 * replaces stack property on object with the complete async stack
 * @param err
 * @param asyncId
 */
function setAsyncStackTrace(err, asyncId) {
    const stack = [];
    const entry = stackUtil.parseErrorStack(err.stack, showFullStackTrace);
    if (entry.trace) {
        stack.push(entry.message);
        stack.push(entry.trace);
    }

    if (asyncId > 1)
        appendAsyncStackTrace(asyncId, stack);
    err.stack = `${stack.join('\n')}\n`;
}

function getAsyncStackTrace(err, asyncId) {
    const stack = [];
    const entry = stackUtil.parseErrorStack(err.stack, showFullStackTrace);
    if (entry.trace) {
        stack.push(entry.message);
        stack.push(entry.trace);
    }

    if (asyncId > 1)
        appendAsyncStackTrace(asyncId, stack);
    return `${stack.join('\n')}\n`;
}

function appendAsyncStackTrace(asyncId, stack) {
    const entry = asyncTraces.get(asyncId);
    // fs.writeSync(1, `appending: ${asyncId}\n`);
    if (entry.trace) {
        stack.push(entry.message);
        stack.push(entry.trace);
    }
    if (entry.parent > 1)
        appendAsyncStackTrace(entry.parent, stack);
}

function findContext(asyncId) {
    const context = contexts.get(asyncId);
    if (context)
        return context;

    const entry = asyncTraces.get(asyncId);
    if (entry && entry.parent)
        return findContext(entry.parent);

    return undefined;
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
    const context = findContext(asyncHooks.triggerAsyncId());
    if (context) {
        errorContext(context, err, 'Uncaught Exception');
        return;
    }
    raiseFatalError(err, 'Uncaught Exception');
});

process.on('unhandledRejection', (err, promise) => {
    // fs.writeSync(1, `unhandledRejection trigger: ${async_hooks.triggerAsyncId()} execution: ${async_hooks.executionAsyncId()}\n`);
    const asyncId = promises.get(promise);
    const context = findContext(asyncId);
    if (context) {
        errorContext(context, err, 'Unhandled Rejection');
        return;
    }
    raiseFatalError(err, 'Unhandled Rejection');
});

function endContext(context) {
    contextOperations.push(() => {
        context[callEnd]();
    });
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
        }, 50);
    }
}

class Context extends asyncHooks.AsyncResource {
    constructor(type, triggerAsyncId) {
        super(type, triggerAsyncId);
        EventEmitter.call(this);
    }

    run(fn) {
        checkContextInterval(this);

        const endPromise = new Promise((...args) => {
            this[callEnd] = () => {
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

module.exports = Context;
