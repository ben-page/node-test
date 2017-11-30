'use strict';
const internalStackLine = /^.*?\((.*[\\\/]node-test[\\\/](lib|node_modules)[\\\/].*|[^\\\/]+|internal[\\\/].*)\)$/;

function* getLineIterator(string) {
    for (let start = 0, end = string.indexOf('\n'); end > -1; end = string.indexOf('\n', start + 1)) {
        yield string.substring(start, end);
        start = end + 1;
    }
}

const v8stackFramePattern = /^\s*at\s*/;

function parseErrorStack(stack, showFullStackTrace) {
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

        if (showFullStackTrace || !internalStackLine.test(line))
            frames.push(line);
    }

    return {
        message: message,
        trace: frames.join('\n')
    };
}

function createStackTrace(stackStartFunction, showFullStackTrace) {
    const t = {};
    Error.captureStackTrace(t, stackStartFunction);

    const parsed = parseErrorStack(t.stack, showFullStackTrace);

    return parsed.trace;
}

module.exports = {
    parseErrorStack,
    createStackTrace
};