/* eslint-disable no-sync */
'use strict';
const traces = require('./traces');
// traces.showFullStackTrace();
const asyncHooks = require('async_hooks');
const fs = require('fs');
const EventEmitter = require('events');

Error.stackTraceLimit = Number.POSITIVE_INFINITY;

const $unhandledError = Symbol('$unhandledError');
const $endContext = Symbol('$endContext');

const resourceTree = new Map();

const contexts = new Map(); //mapping of contexts to the asyncId of the async resource that created the context
const completedContexts = []; //queued context operations

let contextInterval;

const asyncHook = asyncHooks.createHook({
    init(asyncId, type, triggerAsyncId, resource) {
        const executionAsyncId = asyncHooks.executionAsyncId();
        // fs.writeSync(1, `${type}(${asyncId}): trigger: ${triggerAsyncId} execution: ${executionAsyncId}\n`);

        const trace = {
            parent: executionAsyncId,
            children: new Set(),
            destroyed: false
        };
        resourceTree.set(asyncId, trace);

        if (executionAsyncId > 1) {
            const resourceNode = resourceTree.get(executionAsyncId);
            if (resourceNode)
                resourceNode.children.add(asyncId);
        }
    },
    // before(asyncId) {
    //     fs.writeSync(1, `before: ${asyncId}\n`);
    // },
    // after(asyncId) {
    //     fs.writeSync(1, `after: ${asyncId}\n`);
    // },
    destroy(asyncId) {
        // fs.writeSync(1, `destroy: ${asyncId}\n`);
        cleanTraces(asyncId);
    },
    promiseResolve(asyncId) {
        // fs.writeSync(1, `promiseResolve: ${asyncId}\n`);
        cleanTraces(asyncId);
    }
});

function cleanTraces(asyncId) {
    // fs.writeSync(1, `delete: ${asyncId}\n`);
    const resourceNode = resourceTree.get(asyncId);
    if (resourceNode === undefined)
        return;

    if (resourceNode.destroyed && resourceNode.children.size === 0)
        resourceTree.delete(asyncId);

    resourceNode.destroyed = true;

    if (resourceNode.parent <= 1)
        return;

    const parentAsyncTrace = resourceTree.get(resourceNode.parent);
    parentAsyncTrace.children.delete(asyncId);
    // fs.writeSync(1, `removing ${asyncId} from ${resourceNode.parent}\n`);
    //only delete trace when it has been destroyed and all of it's children have been destroyed
    if (parentAsyncTrace.children.size === 0) {
        const context = contexts.get(resourceNode.parent);
        if (context)
            completedContexts.push(context);
        else if (!parentAsyncTrace.destroyed)
            resourceTree.delete(resourceNode.parent);
    }
}

asyncHook.enable();

function findContext(asyncId) {
    const context = contexts.get(asyncId);
    if (context)
        return context;

    const entry = resourceTree.get(asyncId);
    if (entry && entry.parent)
        return findContext(entry.parent);

    return undefined;
}

process.prependListener('uncaughtException', err => {
    fs.writeSync(1, `uncaughtException trigger: ${asyncHooks.triggerAsyncId()} execution: ${asyncHooks.executionAsyncId()}\n`);
    const asyncId = traces.getErrorAsyncId(err);
    if (asyncId) {
        const context = findContext(asyncId);

        if (context) {
            context[$unhandledError] = {
                error: err,
                type: 'Uncaught Exception'
            };
            completedContexts.push(context);
        }
        return;
    }

    if (process.listenerCount('uncaughtException') === 1) {
        fs.writeSync(2, `Uncaught Exception ${err.stack}`);
        // eslint-disable-next-line no-process-exit
        process.exit(1);
    }
});

process.prependListener('unhandledRejection', (err, promise) => {
    // fs.writeSync(1, `unhandledRejection trigger: ${asyncHooks.triggerAsyncId()} execution: ${asyncHooks.executionAsyncId()}\n`);
    const asyncId = traces.getErrorAsyncId(err);
    if (asyncId) {
        const context = findContext(asyncId);

        if (context) {
            context[$unhandledError] = {
                error: err,
                type: 'Unhandled Rejection'
            };
            completedContexts.push(context);
        }
        return;
    }

    if (process.listenerCount('unhandledRejection') === 1) {
        fs.writeSync(2, `Unhandled Rejection ${err.stack}`);
        // eslint-disable-next-line no-process-exit
        process.exit(1);
    }
});

function checkContextInterval() {
    if (!contextInterval) {
        contextInterval = setInterval(() => {
            while(completedContexts.length > 0) {
                const context = completedContexts.shift();
                context[$endContext]();
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
        contexts.set(this.asyncId(), this);
        checkContextInterval();
    }

    run(fn) {
        const endPromise = new Promise((...args) => {
            this[$endContext] = () => {
                args[0]();
            };
        })
            .then(() => {
                if (this[$unhandledError])
                    this.emit('error', this[$unhandledError].error, this[$unhandledError].type);
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
}

traces.setStackStartFunction(Context.prototype, Context.prototype.run);

Object.assign(Context.prototype, EventEmitter.prototype);

module.exports = Context;
