/* eslint-disable no-sync */
'use strict';
const asyncHooks = require('async_hooks');
const stackUtil = require('./stackUtil');
const fs = require('fs');

Error.stackTraceLimit = 50;

let showFullStackTrace = true;

//holds stack traces for each async resource
const asyncTraces = new Map();

//mapping of promise to asyncId that initialized the promise
const promiseLookup = new WeakMap();

//mapping of domains to the asyncId of the async resource that created the domain
const contexts = new Map();

const childTraces = Symbol('childTraces');

const asyncHook = asyncHooks.createHook({
    init(asyncId, type, triggerAsyncId, resource) {
        const executionAsyncId = asyncHooks.executionAsyncId();
        // fs.writeSync(1, `${type}(${asyncId}): trigger: ${triggerAsyncId} execution: ${executionAsyncId}\n`);

        //store trace for this async id
        const trace = stackUtil.createStackTrace(undefined, showFullStackTrace);
        asyncTraces.set(asyncId, {
            parent: executionAsyncId,
            message: `Async call from ${type}(${asyncId}):`,
            trace
        });

        //if there a context for the parent is registered, add this async resource as a child
        if (executionAsyncId > 1) {
            const context = contexts.get(executionAsyncId);
            if (context)
                context[childTraces].add(asyncId);
        }

        if (type === 'PROMISE')
            promiseLookup.set(resource.promise, asyncId);
    },
    // before(asyncId) {
    //     fs.writeSync(1, `before: ${asyncId}\n`);
    // },
    after(asyncId) {
        // fs.writeSync(1, `after: ${asyncId}\n`);

        const context = contexts.get(asyncId);
        if (context)
            checkForOutstandingChildren(context);
    },
    destroy(asyncId) {
        // fs.writeSync(1, `destroy: ${asyncId}\n`);
        cleanTraces(asyncId);
    },
    promiseResolve(asyncId) {
        // fs.writeSync(1, `promiseResolve: ${asyncId}\n`);
        cleanTraces(asyncId);
    }
});

asyncHook.enable();

function cleanTraces(asyncId) {
    fs.writeSync(1, `delete: ${asyncId}\n`);
    const data = asyncTraces.get(asyncId);
    if (!data)
        return;

    // asyncTraces.delete(asyncId);

    if (data.parent <= 1)
        return;

    //remove from context, if one exists
    const context = contexts.get(data.parent);
    if (!context)
        return;
    context[childTraces].delete(asyncId);

    checkForOutstandingChildren(context);
}

function checkForOutstandingChildren(context) {
    //the parent has no outstanding async resources
    if (context[childTraces].size > 0)
        return;

    // const endHandler = context.end;
    process.nextTick(() => {
        context.end();
    });
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
function findContext(asyncId) {
    const context = contexts.get(asyncId);
    if (context)
        return context;

    const entry = asyncTraces.get(asyncId);
    if (entry && entry.parent)
        return findContext(entry.parent);

    return undefined;
}

function raiseError(asyncId, err, message) {
    let context;

    //first look for Context that contains the error
    if (asyncId)
        context = findContext(asyncId);

    //if no context emulate normal Node uncaught exception handling
    if (!context) {
        fs.writeSync(2, `${message}:\n`);
        fs.writeSync(2, err.stack);
        // eslint-disable-next-line no-process-exit
        process.exit(1);
        return;
    }

    context.error(err);
}

process.on('uncaughtException', err => {
    // fs.writeSync(1, `uncaughtException trigger: ${async_hooks.triggerAsyncId()} execution: ${async_hooks.executionAsyncId()}\n`);
    const asyncId = asyncHooks.executionAsyncId();
    raiseError(asyncId, err, 'Uncaught Exception');
});

process.on('unhandledRejection', (err, promise) => {
    // fs.writeSync(1, `unhandledRejection trigger: ${async_hooks.triggerAsyncId()} execution: ${async_hooks.executionAsyncId()}\n`);
    const asyncId = promiseLookup.get(promise);
    raiseError(asyncId, err, 'Unhandled Rejection');
});

//proxy Error object to apply async stack trace
global.Error = (function () {
    return class Error extends global.Error {
        constructor(...args) {
            super(...args);
            setAsyncStackTrace(this, asyncHooks.triggerAsyncId());
        }
    };
})();

class Context extends asyncHooks.AsyncResource {
    constructor(type) {
        super(type);
        this[childTraces] = new Set();

        contexts.set(this.asyncId(), this);
    }

    // eslint-disable-next-line no-empty-function
    error(err) {
    }

    // eslint-disable-next-line no-empty-function
    end() {
    }

    static showFullStackTrace() {
        showFullStackTrace = true;
    }
}

showFullStackTrace = false;

module.exports = Context;
