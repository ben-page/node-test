'use strict';
const async_hooks = require('async_hooks');
const fs = require('fs');
Error.stackTraceLimit = 99;

const internalStackLine = /^.*?\((.*[\\\/]node-test[\\\/](lib|node_modules)[\\\/].*|[^\\\/]+|internal[\\\/].*)\)$/;

const stackTraces = {};
let current = -1;

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

            // if (!internalStackLine.test(line))
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
    },
    before(asyncId) {
        current = asyncId;
        // fs.writeSync(1, `before: ${asyncId}\n`);
    },
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


function setAsyncStackTrace(err) {
    const stack =  [];
    const entry = parseStackTrace(err.stack);
    if (entry.trace) {
        stack.push(entry.message);
        stack.push(entry.trace);
    }

    appendTraces(current, stack);
    err.stack = stack.join('\n')+ '\n';
}

// process.on('uncaughtException', err => {
//     setAsyncStackTrace(err);
//     fs.writeSync(2, err.stack);
// });

function throwError(message, stackStartFunction) {
    if (!stackStartFunction)
        throw new Error('stackStartFunction is required');

    const err = new Error(message);
    setAsyncStackTrace(err);
    // if (Error.captureStackTrace)
    //     Error.captureStackTrace(err, stackStartFunction);
    throw err;
}

module.exports = {
    setAsyncStackTrace,
    throwError
};