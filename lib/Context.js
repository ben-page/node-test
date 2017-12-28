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
const $context = Symbol('$context');

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

        const resourceNode = resourceTree.get(executionAsyncId);
        if (resourceNode) {
            resourceNode.children.add(asyncId);
            // fs.writeSync(1, `adding ${asyncId} to ${executionAsyncId} (${resourceNode.children.size})\n`);
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
    try {
        // fs.writeSync(1, `delete: ${asyncId}\n`);
        const resourceNode = resourceTree.get(asyncId);
        if (resourceNode === undefined)
            return;

        if (resourceNode.destroyed && resourceNode.children.size === 0) {
            resourceTree.delete(asyncId);
            return;
        }

        resourceNode.destroyed = true;

        if (resourceNode.parent > 1) {
            const parentNode = resourceTree.get(resourceNode.parent);
            parentNode.children.delete(asyncId);
            // fs.writeSync(1, `removing ${asyncId} from ${resourceNode.parent} (${parentNode.children.size})\n`);

            //all the children have been destroyed
            if (parentNode.children.size === 0) {
                if (parentNode.destroyed)
                    resourceTree.delete(resourceNode.parent);

                //end associated context
                const context = contexts.get(resourceNode.parent);
                if (context)
                    completedContexts.push(context);
            }
        }
    } catch(err) {
        fs.writeSync(2, 'internal error');
        fs.writeSync(2, err.stack);
        //eslint-disable-next-line no-process-exit
        process.exit(1);
    }
}

asyncHook.enable();

process.prependListener('uncaughtException', err => {
    // fs.writeSync(1, `uncaughtException: ${asyncId}\n`);
    const context = err[$context];

    if (context) {
        context[$unhandledError] = {
            error: err,
            type: 'Uncaught Exception'
        };
        completedContexts.push(context);
        return;
    }

    if (process.listenerCount('uncaughtException') === 1) {
        fs.writeSync(2, `Uncaught Exception ${err.stack}`);
        // eslint-disable-next-line no-process-exit
        process.exit(1);
    }
});

process.prependListener('unhandledRejection', (err, promise) => {
    // fs.writeSync(1, `unhandledRejection: ${asyncId}\n`);
    const context = err[$context];

    if (context) {
        context[$unhandledError] = {
            error: err,
            type: 'Unhandled Rejection'
        };
        completedContexts.push(context);
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
                contexts.delete(this.asyncId());
                this.emitDestroy();
            });

        // fs.writeSync(1, `--run: ${this._i}\n`);
        this.emitBefore();
        try {
            fn();
        } finally {
            this.emitAfter();
        }

        return endPromise;
    }
}

traces.setStackStartFunction(Context.prototype, Context);

Object.assign(Context.prototype, EventEmitter.prototype);

traces.addErrorPreparer((err, trace) => {
    for (trace; trace; trace = trace.parent) {
        if (trace.id) {
            const context = contexts.get(trace.id);
            if (context) {
                err[$context] = context;
                return;
            }
        }
    }
});

module.exports = Context;
