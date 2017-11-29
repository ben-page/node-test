'use strict';
const stackTraces = require('./stackTraces');
const assert = require('assert');
const notSoShallow = require('not-so-shallow');
const timers = require('timers');

const test = Symbol('test');
const traces = Symbol('traces');

function performTest(passed, message, stackStartFunction, actual, expected, operator) {
    if (!passed) {
        throw new assert.AssertionError({
            actual,
            expected,
            operator,
            message,
            stackStartFunction
        });
    }
}


module.exports = class Assert {
    constructor(_test) {
        this[test] = _test;
    }

    pass () {
        // performTest(true);
    }

    fail(message) {
        if (message !== undefined && typeof message !== 'string')
            stackTraces.throwError('argument 1 \'message\' should be a string', Assert.prototype.fail);
        performTest(false, message || 'failed', Assert.prototype.fail);
    }

    true(value, message) {
        if (typeof value !== 'boolean')
            stackTraces.throwError('argument 1 \'value\' should be a boolean', Assert.prototype.true);
        if (message !== undefined && typeof message !== 'string')
            stackTraces.throwError('argument 2 \'message\' should be a string', Assert.prototype.true);
        performTest(value === true, message, Assert.prototype.true, value, true, '===');
    }

    false(value, message) {
        if (typeof value !== 'boolean')
            stackTraces.throwError('argument 1 \'value\' should be a boolean', Assert.prototype.false);
        if (message !== undefined && typeof message !== 'string')
            stackTraces.throwError('argument 2 \'message\' should be a string', Assert.prototype.false);
        performTest(value === false, message, Assert.prototype.false, value, false, '===');
    };

    truthy(value, message) {
        if (message !== undefined && typeof message !== 'string')
            stackTraces.throwError('argument 2 \'message\' should be a string', Assert.prototype.truthy);
        performTest(value, message, Assert.prototype.truthy, value, true, '==');
    }

    assert(value, message) {
        if (message !== undefined && typeof message !== 'string')
            stackTraces.throwError('argument 2 \'message\' should be a string', Assert.prototype.assert);
        performTest(value, message, Assert.prototype.assert, value, true, '==');
    }

    falsey(value, message) {
        if (message !== undefined && typeof message !== 'string')
            stackTraces.throwError('argument 2 \'message\' should be a string', Assert.prototype.falsey);
        performTest(!value, message, Assert.prototype.falsey, value, false, '==');
    }

    equal(value, expected, message) {
        if (message !== undefined && typeof message !== 'string')
            stackTraces.throwError('argument 3 \'message\' should be a string', Assert.prototype.equal);
        performTest(value === expected, message, Assert.prototype.equal, value, expected, '===');
    }

    equals(value, expected, message) {
        if (message !== undefined && typeof message !== 'string')
            stackTraces.throwError('argument 3 \'message\' should be a string', Assert.prototype.equals);
        performTest(value === expected, message, Assert.prototype.equals, value, expected, '===');
    }

    is(value, expected, message) {
        if (message !== undefined && typeof message !== 'string')
            stackTraces.throwError('argument 3 \'message\' should be a string', Assert.prototype.is);
        performTest(value === expected, message, Assert.prototype.is, value, expected, '===');
    }

    notEqual(value, expected, message) {
        if (message !== undefined && typeof message !== 'string')
            stackTraces.throwError('argument 3 \'message\' should be a string', Assert.prototype.notEqual);
        performTest(value !== expected, message, Assert.prototype.notEqual, value, expected, '!==');
    }

    not(value, expected, message) {
        if (message !== undefined && typeof message !== 'string')
            stackTraces.throwError('argument 3 \'message\' should be a string', Assert.prototype.not);
        performTest(value !== expected, message, Assert.prototype.not, value, expected, '!==');
    }

    notEquals(value, expected, message) {
        if (message !== undefined && typeof message !== 'string')
            stackTraces.throwError('argument 3 \'message\' should be a string', Assert.prototype.notEquals);
        performTest(value !== expected, message, Assert.prototype.notEquals, value, expected, '!==');
    }

    deepEqual(value, expected, message) {
        if (message !== undefined && typeof message !== 'string')
            stackTraces.throwError('argument 3 \'message\' should be a string', Assert.prototype.deepEqual);
        performTest(notSoShallow(value, expected), message, Assert.prototype.deepEqual, value, expected, 'deepEqual');
    }

    notDeepEqual(value, expected, message) {
        if (message !== undefined && typeof message !== 'string')
            stackTraces.throwError('argument 3 \'message\' should be a string', Assert.prototype.notDeepEqual);
        performTest(!notSoShallow(value, expected), message, Assert.prototype.notDeepEqual, value, expected, '!deepEqual');
    }

    greaterThan(value, expected, message) {
        if (message !== undefined && typeof message !== 'string')
            stackTraces.throwError('argument 3 \'message\' should be a string', Assert.prototype.greaterThan);
        performTest(value > expected, message, Assert.prototype.deepEqual, value, expected, '>');
    }

    greaterThanOrEqual(value, expected, message) {
        if (message !== undefined && typeof message !== 'string')
            stackTraces.throwError('argument 3 \'message\' should be a string', Assert.prototype.greaterThanOrEqual);
        performTest(value >= expected, message, Assert.prototype.greaterThanOrEqual, value, expected, '>=');
    }

    lessThan(value, expected, message) {
        if (message !== undefined && typeof message !== 'string')
            stackTraces.throwError('argument 3 \'message\' should be a string', Assert.prototype.lessThan);
        performTest(value < expected, message, Assert.prototype.deepEqual, value, expected, '<');
    }

    lessThanOrEqual(value, expected, message) {
        if (message !== undefined && typeof message !== 'string')
            stackTraces.throwError('argument 3 \'message\' should be a string', Assert.prototype.lessThanOrEqual);
        performTest(value <= expected, message, Assert.prototype.lessThanOrEqual, value, expected, '<=');
    }

    noError(value, message) {
        if (message !== undefined && typeof message !== 'string')
            stackTraces.throwError('argument 2 \'message\' should be a string', Assert.prototype.noError);
        performTest(!value, message, Assert.prototype.noError, value, 'Error', '!==');
    }

    async throws(fn, arg) {
        if (typeof fn !== 'function')
            stackTraces.throwError('argument 1 \'fn\' should be a function', Assert.prototype.throws);

        if (fn.length > 1)
            stackTraces.throwError('argument 1 \'fn\' should be a function with 0 or 1 argument', Assert.prototype.throws);

        let validateError, message;

        switch (typeof arg) {
            case 'string':
                message = arg;
                break;
            case 'function':
                validateError = arg;
                break;
            case 'undefined':
                break;
            default:
                stackTraces.throwError('argument 2 should be a function or string', Assert.prototype.throws);
        }

        const thenHandler = () => {
            message = message || 'Expected Error but none was thrown';
            performTest(false, message, Assert.prototype.throws);
        };

        const catchHandler = err => {
            if (validateError) {
                const result2 = validateError(err);
                if (result2 instanceof Promise)
                    return result2;
            }
            //swallow error, because throws wants an error
        };

        let result;
        try {
            result = this[test].constructor.runAsync(fn);
        } catch (err) {
            return catchHandler(err);
        }

        if (result instanceof Promise) {
            try {
                await result;
                thenHandler();
            } catch (err) {
                return catchHandler(err);
            }
        }

        return undefined;
    }

    notThrows(fn, message) {
        if (typeof fn !== 'function')
            stackTraces.throwError('argument 1 \'fn\' should be a function', Assert.prototype.notThrows);

        if (fn.length > 1)
            stackTraces.throwError('argument 1 \'fn\' should be a function with 0 or 1 argument', Assert.prototype.notThrows);

        if (message !== undefined && typeof message !== 'string')
            stackTraces.throwError('argument 2 \'message\' should be a string', Assert.prototype.notThrows);

        return this[test].constructor.runAsync(fn);
    }

    async(...args) {
        // const stackTrace = util.getStackTrace(Assert.prototype.async);
        let fn, count;

        if (args.length < 0 || args.length > 2)
            stackTraces.throwError('expected between 0 and 2 arguments', Assert.prototype.async);

        if (args.length >= 1) {
            switch (typeof args[0]) {
                case 'function':
                    fn = args[0];
                    break;
                case 'number':
                    count = args[0];
                    break;
                default:
                    stackTraces.throwError('argument 1 should be a function or number', Assert.prototype.async);
            }

            if (args.length === 2) {
                if (fn === undefined)
                    stackTraces.throwError('unexpected argument 2', Assert.prototype.async);

                count = args[1];
                if (typeof count !== 'number' || count <= 0 || parseInt(count) !== count)
                    stackTraces.throwError('argument 2 \'count\' should be a whole number greater than 0', Assert.prototype.async);
            }
        }

        if (count === undefined)
            count = 1;

        let resolve,
            reject,
            c = 0,
            fulfilled = false;

        const callback = (...args2) => {
            this[traces].unshift(stackTrace);
            if (fn) {
                try {
                    fn.apply(this, args2);
                } catch (err) {
                    fulfilled = true;
                    reject(err);
                    return;
                } finally {
                    this[traces].shift();
                }
            } else {
                if (args2[0]) {
                    let err;
                    if (args2[0] instanceof Error) {
                        err = args2[0];
                    } else {
                        err = new Error(args2[0].toString());
                        if (Error.captureStackTrace)
                            Error.captureStackTrace(err, Assert.prototype.async);
                    }

                    fulfilled = true;
                    reject(err);
                    return;
                }
            }

            if (fulfilled)
                stackTraces.throwError('callback executed after test completed', Assert.prototype.async);

            if (++c > count) {
                fulfilled = true;

                reject(new assert.AssertionError({
                    actual: c,
                    expected: count,
                    operator: '===',
                    message: 'count exceeded',
                    stackStartFunction: Assert.prototype.async
                }));

            } else if (c === count) {
                //Wait a tick, so that other code a chance to run and call the callback too many times (if it's going to).
                timers.setImmediate(() => {
                    if (fulfilled) //if done was called again while we waited, the promise has been rejected
                        return;

                    fulfilled = true;
                    resolve();
                });
            }
        };

        const p = new Promise((...args2) => {
            resolve = args2[0];
            reject = args2[1];
        });

        this[test].addPromise(p, [stackTrace].concat(this[traces]));

        return callback;
    }
};
