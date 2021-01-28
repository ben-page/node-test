'use strict';
const assert = require('assert');
const notSoShallow = require('not-so-shallow');
const shared = require('./shared.js');

function performTest(passed, message, actual, expected, operator, stackStartFunction) {
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

const t = {
    pass() {
        // performTest(true);
    },

    fail(message) {
        if (message !== undefined && typeof message !== 'string')
            throw new Error('argument 1 \'message\' should be a string');
        performTest(false, message || 'failed', t.fail);
    },

    true(value, message) {
        if (typeof value !== 'boolean')
            throw new Error('argument 1 \'value\' should be a boolean');
        if (message !== undefined && typeof message !== 'string')
            throw new Error('argument 2 \'message\' should be a string');
        performTest(value === true, message, value, true, '===');
    },

    false(value, message) {
        if (typeof value !== 'boolean')
            throw new Error('argument 1 \'value\' should be a boolean');
        if (message !== undefined && typeof message !== 'string')
            throw new Error('argument 2 \'message\' should be a string');
        performTest(value === false, message, value, false, '===');
    },

    truthy(value, message) {
        if (message !== undefined && typeof message !== 'string')
            throw new Error('argument 2 \'message\' should be a string');
        performTest(value, message, value, true, '==');
    },

    assert(value, message) {
        if (message !== undefined && typeof message !== 'string')
            throw new Error('argument 2 \'message\' should be a string');
        performTest(value, message, value, true, '==');
    },

    falsey(value, message) {
        if (message !== undefined && typeof message !== 'string')
            throw new Error('argument 2 \'message\' should be a string');
        performTest(!value, message, value, false, '==');
    },

    equal(value, expected, message) {
        if (message !== undefined && typeof message !== 'string')
            throw new Error('argument 3 \'message\' should be a string');
        performTest(value === expected, message, value, expected, '===');
    },

    equals(value, expected, message) {
        if (message !== undefined && typeof message !== 'string')
            throw new Error('argument 3 \'message\' should be a string');
        performTest(value === expected, message, value, expected, '===');
    },

    is(value, expected, message) {
        if (message !== undefined && typeof message !== 'string')
            throw new Error('argument 3 \'message\' should be a string');
        performTest(value === expected, message, value, expected, '===');
    },

    notEqual(value, expected, message) {
        if (message !== undefined && typeof message !== 'string')
            throw new Error('argument 3 \'message\' should be a string');
        performTest(value !== expected, message, value, expected, '!==');
    },

    not(value, expected, message) {
        if (message !== undefined && typeof message !== 'string')
            throw new Error('argument 3 \'message\' should be a string');
        performTest(value !== expected, message, value, expected, '!==');
    },

    notEquals(value, expected, message) {
        if (message !== undefined && typeof message !== 'string')
            throw new Error('argument 3 \'message\' should be a string');
        performTest(value !== expected, message, value, expected, '!==');
    },

    deepEqual(value, expected, message) {
        if (message !== undefined && typeof message !== 'string')
            throw new Error('argument 3 \'message\' should be a string');
        performTest(notSoShallow(value, expected), message, value, expected, 'deepEqual');
    },

    notDeepEqual(value, expected, message) {
        if (message !== undefined && typeof message !== 'string')
            throw new Error('argument 3 \'message\' should be a string');
        performTest(!notSoShallow(value, expected), message, value, expected, '!deepEqual');
    },

    greaterThan(value, expected, message) {
        if (message !== undefined && typeof message !== 'string')
            throw new Error('argument 3 \'message\' should be a string');
        performTest(value > expected, message, value, expected, '>');
    },

    greaterThanOrEqual(value, expected, message) {
        if (message !== undefined && typeof message !== 'string')
            throw new Error('argument 3 \'message\' should be a string');
        performTest(value >= expected, message, value, expected, '>=');
    },

    lessThan(value, expected, message) {
        if (message !== undefined && typeof message !== 'string')
            throw new Error('argument 3 \'message\' should be a string');
        performTest(value < expected, message, value, expected, '<');
    },

    lessThanOrEqual(value, expected, message) {
        if (message !== undefined && typeof message !== 'string')
            throw new Error('argument 3 \'message\' should be a string');
        performTest(value <= expected, message, value, expected, '<=');
    },

    noError(value, message) {
        if (message !== undefined && typeof message !== 'string')
            throw new Error('argument 2 \'message\' should be a string');
        performTest(!value, message, value, 'Error', '!==');
    },

    throws(fn, ...args) {
        if (typeof fn !== 'function')
            throw new Error('argument 1 \'fn\' should be a function');

        if (fn.length > 1)
            throw new Error('argument 1 \'fn\' should be a function with 0 or 1 argument');

        let validateError, message;

        if (args.length > 0) {
            switch (typeof args[0]) {
                case 'string':
                    message = args[0];
                    break;
                case 'function':
                    validateError = args[0];
                    break;
                case 'undefined':
                    break;
                default:
                    throw new Error('argument 2 should be a function or string');
            }

            if (args.length > 1) {
                if (typeof args[0] === 'string')
                    message = args[0];
                else
                    throw new Error('argument 3 \'message\' should be a string');
            }
        }

        const thenHandler = () => {
            message = message || 'Expected Error but none was thrown';
            performTest(false, message, undefined, undefined, undefined, t.throws);
        };

        const catchHandler = err => {
            if (validateError)
                return validateError(err);

            //swallow error, because throws wants an error
            return undefined;
        };

        let result;
        try {
            result = shared.runFn(-1, fn);
        } catch (err) {
            return catchHandler(err);
        }

        if (result instanceof Promise)
            return result.then(thenHandler, catchHandler);

        thenHandler();
        return undefined;
    },

    count(fn, count) {
        if (typeof fn !== 'function')
            throw new Error('argument 1 \'fn\' should be a function');

        if (count === undefined)
            count = 1;

        if (typeof count !== 'number')
            throw new Error('argument 2 \'count\' should be a number');

        if (count <= 0)
            throw new Error('argument 2 \'count\' should be a number greater than 0');

        let resolve,
            reject,
            c = 0;

        const p = new Promise((...args2) => {
            resolve = () => {
                args2[0]();
            };
            reject = () => {
                args2[1]();
            };
        });

        const callback = err => {
            if (err) {
                reject(err);
                return;
            }

            if (++c > count) {
                throw new assert.AssertionError({
                    actual: c,
                    expected: count,
                    operator: '===',
                    message: 'count exceeded'
                });

            } else if (c === count) {
                resolve();
            }
        };

        try {
            fn(callback);
        } catch (err) {
            if (++c > count)
                throw err;
            else
                reject(err);
        }

        return p;
    }
};

module.exports = t;
