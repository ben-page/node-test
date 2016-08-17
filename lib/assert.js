'use strict';
const assert = require('assert');
const notSoShallow = require('not-so-shallow');
const Promise = require('bluebird');
const util = require('./util');
const join = require('path').join;
const timers = require('timers');

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

function Assert(test) {
    this._test = test;
}

Assert.prototype.pass = function() {
    // performTest(true);
};

Assert.prototype.fail = function(message) {
    if (message !== undefined && typeof message !== 'string')
        util.throwError('argument 1 \'message\' should be a string', Assert.prototype.fail);
    performTest(false, message || 'failed', Assert.prototype.fail);
};

Assert.prototype.true = function(value, message) {
    if (typeof value !== 'boolean')
        util.throwError('argument 1 \'value\' should be a boolean', Assert.prototype.true);
    if (message !== undefined && typeof message !== 'string')
        util.throwError('argument 2 \'message\' should be a string', Assert.prototype.true);
    performTest(value === true, message, Assert.prototype.true, value, true, '===');
};

Assert.prototype.false = function(value, message) {
    if (typeof value !== 'boolean')
        util.throwError('argument 1 \'value\' should be a boolean', Assert.prototype.false);
    if (message !== undefined && typeof message !== 'string')
        util.throwError('argument 2 \'message\' should be a string', Assert.prototype.false);
    performTest(value === false, message, Assert.prototype.false, value, false, '===');
};

Assert.prototype.truthy = function(value, message) {
    if (message !== undefined && typeof message !== 'string')
        util.throwError('argument 2 \'message\' should be a string', Assert.prototype.truthy);
    performTest(value, message, Assert.prototype.truthy, value, true, '==');
};

Assert.prototype.assert = function(value, message) {
    if (message !== undefined && typeof message !== 'string')
        util.throwError('argument 2 \'message\' should be a string', Assert.prototype.assert);
    performTest(value, message, Assert.prototype.assert, value, true, '==');
};

Assert.prototype.falsey = function(value, message) {
    if (message !== undefined && typeof message !== 'string')
        util.throwError('argument 2 \'message\' should be a string', Assert.prototype.falsey);
    performTest(!value, message, Assert.prototype.falsey, value, false, '==');
};

Assert.prototype.equal = function(value, expected, message) {
    if (message !== undefined && typeof message !== 'string')
        util.throwError('argument 3 \'message\' should be a string', Assert.prototype.equal);
    performTest(value === expected, message, Assert.prototype.equal, value, expected, '===');
};
Assert.prototype.equals = function(value, expected, message) {
    if (message !== undefined && typeof message !== 'string')
        util.throwError('argument 3 \'message\' should be a string', Assert.prototype.equals);
    performTest(value === expected, message, Assert.prototype.equals, value, expected, '===');
};
Assert.prototype.is = function(value, expected, message) {
    if (message !== undefined && typeof message !== 'string')
        util.throwError('argument 3 \'message\' should be a string', Assert.prototype.is);
    performTest(value === expected, message, Assert.prototype.is, value, expected, '===');
};

Assert.prototype.notEqual = function(value, expected, message) {
    if (message !== undefined && typeof message !== 'string')
        util.throwError('argument 3 \'message\' should be a string', Assert.prototype.notEqual);
    performTest(value !== expected, message, Assert.prototype.notEqual, value, expected, '!==');
};
Assert.prototype.not = function(value, expected, message) {
    if (message !== undefined && typeof message !== 'string')
        util.throwError('argument 3 \'message\' should be a string', Assert.prototype.not);
    performTest(value !== expected, message, Assert.prototype.not, value, expected, '!==');
};
Assert.prototype.notEquals = function(value, expected, message) {
    if (message !== undefined && typeof message !== 'string')
        util.throwError('argument 3 \'message\' should be a string', Assert.prototype.notEquals);
    performTest(value !== expected, message, Assert.prototype.notEquals, value, expected, '!==');
};

Assert.prototype.deepEqual = function(value, expected, message) {
    if (message !== undefined && typeof message !== 'string')
        util.throwError('argument 3 \'message\' should be a string', Assert.prototype.deepEqual);
    performTest(notSoShallow(value, expected), message, Assert.prototype.deepEqual, value, expected, 'deepEqual');
};

Assert.prototype.notDeepEqual = function(value, expected, message) {
    if (message !== undefined && typeof message !== 'string')
        util.throwError('argument 3 \'message\' should be a string', Assert.prototype.notDeepEqual);
    performTest(!notSoShallow(value, expected), message, Assert.prototype.notDeepEqual, value, expected, '!deepEqual');
};

Assert.prototype.greaterThan = function(value, expected, message) {
    if (message !== undefined && typeof message !== 'string')
        util.throwError('argument 3 \'message\' should be a string', Assert.prototype.greaterThan);
    performTest(value > expected, message, Assert.prototype.deepEqual, value, expected, '>');
};

Assert.prototype.greaterThanOrEqual = function(value, expected, message) {
    if (message !== undefined && typeof message !== 'string')
        util.throwError('argument 3 \'message\' should be a string', Assert.prototype.greaterThanOrEqual);
    performTest(value >= expected, message, Assert.prototype.greaterThanOrEqual, value, expected, '>=');
};

Assert.prototype.lessThan = function(value, expected, message) {
    if (message !== undefined && typeof message !== 'string')
        util.throwError('argument 3 \'message\' should be a string', Assert.prototype.lessThan);
    performTest(value < expected, message, Assert.prototype.deepEqual, value, expected, '<');
};

Assert.prototype.lessThanOrEqual = function(value, expected, message) {
    if (message !== undefined && typeof message !== 'string')
        util.throwError('argument 3 \'message\' should be a string', Assert.prototype.lessThanOrEqual);
    performTest(value <= expected, message, Assert.prototype.lessThanOrEqual, value, expected, '<=');
};

Assert.prototype.noError = function(value, message) {
    if (message !== undefined && typeof message !== 'string')
        util.throwError('argument 2 \'message\' should be a string', Assert.prototype.noError);
    performTest(!value, message, Assert.prototype.noError, value, 'Error', '!==');
};

Assert.prototype.throws = function(fn, arg) {
    if (typeof fn !== 'function')
        util.throwError('argument 1 \'fn\' should be a function', Assert.prototype.throws);
    
    if (fn.length > 1)
        util.throwError('argument 1 \'fn\' should be a function with 0 or 1 argument', Assert.prototype.throws);
    
    let testErrorFn, message;
    
    switch (typeof arg) {
        case 'string':
            message = arg;
            break;
        case 'function':
            testErrorFn = arg;
            break;
        case 'undefined':
            break;
        default:
            util.throwError('argument 2 should be a function or string', Assert.prototype.throws);
    }
    let result;
    
    try {
        result = util.runAsync(fn);
        
    } catch (err) {
        if (testErrorFn) {
            const result2 = testErrorFn(err);
            if (util.isPromise(result2))
                this._test._addPromise(result2);
        }
    }
    
    if (util.isPromise(result)) {
        const handled = result
            .then(() => {
                message = message || 'Expected Error but none was thrown';
                performTest(false, message, Assert.prototype.throws);
            },
            err => {
                if (testErrorFn)
                    return Promise.try(() => testErrorFn(err));
                return undefined;
            });
        this._test._addPromise(handled);
    }
};

const stackLine = new RegExp(`^\\s+at doRunAsync \\(.*?${join('node-test','lib','util.js').replace(/\\/g,'\\\\')}:[0-9]+:[0-9]+\\)`, 'm');

Assert.prototype.notThrows = function(fn, message) {
    if (typeof fn !== 'function')
        util.throwError('argument 1 \'fn\' should be a function', Assert.prototype.notThrows);
    
    if (fn.length > 1)
        util.throwError('argument 1 \'fn\' should be a function with 0 or 1 argument', Assert.prototype.notThrows);

    if (message !== undefined && typeof message !== 'string')
        util.throwError('argument 2 \'message\' should be a string', Assert.prototype.notThrows);
    
    let result;
    try {
        result = util.runAsync(fn);
        
    } catch (err) {
        if (err instanceof assert.AssertionError)
            throw err;
        
        let originalStack = err.stack;
        
        for (let i = 0, j = originalStack.indexOf('\n', 0); j < originalStack.length; i = j, j = originalStack.indexOf('\n', j+1)) {
            /* istanbul ignore if  */
            if (j === -1)
                break;
            
            const line = originalStack.substring(i, j);
            
            if (stackLine.test(line)) {
                originalStack = originalStack.substring(0, i);
                break;
            }
        }
        const err2 = new assert.AssertionError({
            message: message || 'Unexpected Error was thrown',
            stackStartFunction: Assert.prototype.notThrows
        });
        err2.stack = `${originalStack}\n${err2.stack}`;
        throw err2;
    }
    
    if (util.isPromise(result))
        this._test._addPromise(result);
};

Assert.prototype.count = function(fn, count, message) {
    if (typeof fn !== 'function')
        util.throwError('argument 1 \'fn\' should be a function', Assert.prototype.count);

    if (fn.length !== 1)
        util.throwError('argument 1 \'fn\' should be a function with 1 argument', Assert.prototype.count);

    if (typeof count !== 'number' || count <= 0 || parseInt(count) !== count)
        util.throwError('argument 2 \'count\' should be a whole number greater than 0', Assert.prototype.count);

    if (message !== undefined && typeof message !== 'string')
        util.throwError('argument 3 \'message\' should be a string', Assert.prototype.count);

    let resolve,
        reject,
        c = 0,
        fulfilled = false;

    const callback = () => {
        if (fulfilled)
            util.throwError('callback executed after test completed');

        if (++c > count) {
            fulfilled = true;

            reject(new assert.AssertionError({
                actual: c,
                expected: count,
                operator: '===',
                message: message || 'count exceeded',
                stackStartFunction: Assert.prototype.async
            }));

        } else if (c === count) {
            //Wait a tick, sot that other code a chance to run and call the callback too many times (if it's going to).
            timers.setImmediate(() => {
                if (fulfilled) //if done was called again while we waited, the promise has been rejected
                    return;

                fulfilled = true;
                resolve();
            });
        }
    };

    const p = new Promise((...args) => {
        resolve = args[0];
        reject = args[1];
    });
    
    const result = fn(callback);
    if (util.isPromise(result))
        this._test._addPromise(result);
    
    this._test._addPromise(p);

    return callback;
};

module.exports = Assert;
