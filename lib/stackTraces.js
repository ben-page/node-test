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

            if (!internalStackLine.test(line))
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

function setStackTrace(err, ...traces) {
    const parsed = parseStackTrace(err.stack);

    err.stack = buildStack(parsed.message, traces.length > 0 ? traces : parsed.traces);

    return err;
}
//
// function concatStackTraces(err, ...calls) {
//     const parsed = parseStackTrace(err.stack);
//
//     let traces = parsed.traces;
//     for (const call of calls)
//         traces = cleanOverlapping(traces, call);
//     err.stack = buildStack(parsed.message, traces);
//
//     return err;
// }

function concatStackTraces(err, ...traces) {
    const parsed = parseStackTrace(err.stack);

    let traces2 = [ parsed.trace ].concat(...traces);
    err.stack = buildStack(parsed.message, traces2);

    return err;
}

function buildStack(message, traces) {
    let stack = message;
    for (let i = 0; i < traces.length; i++) {
        const trace = traces[i];
        stack += `\n${trace}`;
    }

    stack += '\n';

    return stack;
}

const asyncHook = async_hooks.createHook({
    init(asyncId, type, triggerAsyncId, resource) {
        const eid = async_hooks.executionAsyncId();
        fs.writeSync(1, `${type}(${asyncId}): trigger: ${triggerAsyncId} execution: ${eid}\n`);
        // fs.writeSync(1, `${resource.constructor.name}\n`);

        if (type === 'Timeout' || type === 'sdsda') {
            const trace = getStackTrace(setTimeout);
            stackTraces[asyncId] = {
                parent: eid,
                trace: `Async call from Timeout:\n${trace}`
            };
        }
    },
    before(asyncId) {
        current = asyncId;
        fs.writeSync(1, `before: ${asyncId}\n`);
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

function getStackTraces(asyncId, traces) {
    const entry = stackTraces[asyncId];
    traces.push(entry.trace);
    if (entry.parent > 1)
        getStackTraces(entry.parent, traces);
}

function getAllStackTraces() {
    const traces = [];
    getStackTraces(current, traces);
    return traces;
}

process.on('uncaughtException', err => {
    setAsyncStackTrace(err);
    fs.writeSync(2, err.stack);
});

asyncHook.enable();

function setAsyncStackTrace(err) {
    concatStackTraces(err, getAllStackTraces());
}

module.exports = {
    getStackTrace,
    setAsyncStackTrace
};