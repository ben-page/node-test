/* eslint-disable no-sync */
'use strict';
const asyncHooks = require('async_hooks');
// const fs = require('fs');
const path = require('path');

//https://github.com/v8/v8/wiki/Stack-Trace-API

Error.stackTraceLimit = Number.POSITIVE_INFINITY;

const $frames = Symbol('$frames'); //frames from a single trace
const $trace = Symbol('$trace'); //top trace linked to previous async traces
const $temp = Symbol('$temp'); //top trace linked to previous async traces
const $stackStartFunction = Symbol('$stackStartFunction');
const $asyncId = Symbol('$asyncId');
const projectDir = path.resolve(__dirname, '../');

const traces = new Map();
const captureStackTrace = Error.captureStackTrace;
const preparers = [];

let showFullStackTrace = false;
let isInternalCapture = false;

function captureStackFrames(stackStartFunction) {
    const t = {};
    isInternalCapture = true;
    captureStackTrace(t, stackStartFunction);
    prepareStackTrace(t);
    isInternalCapture = false;
    return t[$frames];
}

function prepareStackTrace(err) {
    err[$temp] = err.stack; //trigger prepareStackTrace
    delete err[$temp];
}

const asyncHook = asyncHooks.createHook({
    init(asyncId, type, triggerAsyncId, resource) {
        const executionAsyncId = asyncHooks.executionAsyncId();
        // fs.writeSync(1, `${type}(${asyncId}): trigger: ${triggerAsyncId} execution: ${executionAsyncId}\n`);

        const stackStartFunction = resource
            ? resource[$stackStartFunction]
            : undefined;

        const trace = {
            id: asyncId,
            // message: `Async call from ${type}(${asyncId}):`,
            message: `Async call from ${type}:`,
            frames: captureStackFrames(stackStartFunction),
            parent: traces.get(executionAsyncId)
        };
        traces.set(asyncId, trace);
    },
    // before(asyncId) {
    //     // fs.writeSync(1, `before: ${asyncId}\n`);
    // },
    // after(asyncId) {
    //     // fs.writeSync(1, `after: ${asyncId}\n`);
    // },
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
    let isTop = true;
    while (trace) {
        const traceLines = [];
        for (const frame of trace.frames) {
            if (includeFrame(frame)) {
                let functionName = frame.getFunctionName();
                const fileName = frame.getFileName();
                const lineNumber = frame.getLineNumber();
                const columnNumber = frame.getColumnNumber();

                let call;
                if (frame.isConstructor()) {
                    call = `new ${functionName}`;

                } else {
                    const typeName = frame.getTypeName();
                    const methodName = frame.getMethodName();

                    // call = typeName === null ? '' : typeName + '.';
                    if (functionName) {
                        if (typeName === null) { //no type
                            call = functionName;

                        } else {
                            //functionName contains type already, remove it
                            if (functionName.substr(0, typeName.length + 1) === `${typeName}.`)
                                functionName = functionName.substr(typeName.length + 1);

                            call = `${typeName}.${functionName}`;
                        }

                        //if method exist and is different
                        if (methodName && functionName !== methodName && !functionName.match(`.*\.${methodName}`))
                            call += ` [as ${methodName}]`;

                    } else if (methodName) {
                        if (typeName === null) //no type
                            call = methodName;
                        else //type and function
                            call = `${typeName}.${methodName}`;

                    } else {
                        call = '<anonymous>';
                    }
                }

                //todo: support eval()
                if (fileName) {
                    const location = `${fileName}:${lineNumber}:${columnNumber}`;
                    traceLines.push(`    at ${call} (${location})`);
                } else {
                    traceLines.push(`    at ${call}`);
                }
            }
        }

        if (traceLines.length > 0 || isTop) {
            lines.push(trace.message);
            lines.push(...traceLines);
        }

        trace = trace.parent;
        isTop = false;
    }

    return lines.join('\n');
}

Object.defineProperty(Error, 'prepareStackTrace', {
    value: function (error, frames) {
        error[$frames] = frames;

        if (isInternalCapture)
            return undefined;

        // fs.writeSync(1, `---prepareStackTrace - trigger: ${asyncHooks.triggerAsyncId()} execution: ${asyncHooks.executionAsyncId()}\n`);

        const trace = {
            id: error[$asyncId],
            message: global.Error.prototype.toString.call(error),
            frames,
            parent: traces.get(error[$asyncId])
        };

        error[$trace] = trace;

        for (const preparer of preparers)
            preparer(error, trace);

        return printStackTrace(trace);
    }
});

Object.defineProperty(Error, 'captureStackTrace', {
    value: function (error, stackStartFunction) {
        if (!error[$asyncId]) {
            error[$asyncId] = asyncHooks.executionAsyncId();
            prepareStackTrace(error);
        }
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
            prepareStackTrace(this);
        }
    };
})();

module.exports = {
    showFullStackTrace() {
        showFullStackTrace = true;
    },
    setStackStartFunction(resource, stackStartFunction) {
        resource[$stackStartFunction] = stackStartFunction;
    },
    addErrorPreparer(preparer) {
        preparers.push(preparer);
    }
};
