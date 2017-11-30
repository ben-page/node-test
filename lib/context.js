'use strict';
const async_hooks = require('async_hooks');
const stackUtil = require('./stackUtil');
const fs = require('fs');

Error.stackTraceLimit = 50;

let showFullStackTrace = true;

//holds stack traces for each async resource
const asyncTraces = new Map();

//mapping of promise to asyncId that initialized the promise
const promiseLookup = new WeakMap();

//mapping of domains to the asyncId of the async resource that created the domain
const asyncCallbacks = new Map();

//
const asyncHook = async_hooks.createHook({
    init(asyncId, type, triggerAsyncId, resource) {
        const executionAsyncId = async_hooks.executionAsyncId();
        // fs.writeSync(1, `${type}(${asyncId}): trigger: ${triggerAsyncId} execution: ${executionAsyncId}\n`);

        //store trace for this async id
        const trace = stackUtil.createStackTrace();
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
    // fs.writeSync(1, `delete: ${asyncId}\n`);
    const data = asyncTraces.get(asyncId);
    if (!data)
        return;
    asyncTraces.delete(asyncId);
    //remove async resource from parent
    if (data.parent <= 1)
        return;

    //locate parent async trace
    const parent = asyncTraces.get(data.parent);
    if (!parent)
        return;
    parent.children.delete(asyncId);

    //the parent has no outstanding async resources
    if (parent.children.size === 0) {
        const callbacks = asyncCallbacks.get(data.parent);
        if (callbacks) {
            const endHandler = callbacks.end;
            process.nextTick(() => {
                endHandler();
            });
        }
    }
}

/**
 * replaces stack property on object with the complete async stack
 * @param err
 * @param asyncId
 */
function setAsyncStackTrace(err, asyncId) {
    const stack =  [];
    const entry = stackUtil.parseErrorStack(err.stack);
    if (entry.trace) {
        stack.push(entry.message);
        stack.push(entry.trace);
    }

    appendAsyncStackTrace(asyncId, stack);
    err.stack = stack.join('\n')+ '\n';
}

function appendAsyncStackTrace(asyncId, stack) {
    const entry = asyncTraces.get(asyncId);
    if (entry.trace) {
        stack.push(entry.message);
        stack.push(entry.trace);
    }
    if (entry.parent > 1)
        appendAsyncStackTrace(entry.parent, stack);
}

/***
 *
 * @param asyncId
 * @returns {*}
 */
function findErrorHandler(asyncId) {
    const callbacks = asyncCallbacks.get(asyncId);
    if (callbacks)
        return callbacks.error;

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

//proxy Error object to apply async stack trace
global.Error = (function() {
    return class Error extends global.Error {
        constructor(...args) {
            super(...args);
            setAsyncStackTrace(this, async_hooks.executionAsyncId());
        }
    }
})();

module.exports = {
    createContext(...args) {
        let asyncId, callbacks;
        switch (args.length) {
            case 1:
                if (typeof args[1] !== 'object')
                    throw new Error('argument 1 \'callbacks\' should be a object');
                asyncId = async_hooks.triggerAsyncId();
                callbacks = args[1];
                break;
            case 2:
                if (typeof args[0] !== 'number')
                    throw new Error('argument 1 \'asyncId\' should be a number');
                if (typeof args[1] !== 'object')
                    throw new Error('argument 2 \'callbacks\' should be a object');
                asyncId = args[0];
                callbacks = args[1];
            break;
            default:
                throw new Error('expected 1 or 2 arguments');

        }

        if (!callbacks.error && !callbacks.end)
            throw new Error('callbacks object contains no valid callbacks');

        asyncCallbacks.set(asyncId, callbacks);
    },
    showFullStackTrace() {
        showFullStackTrace = true;
    }
};