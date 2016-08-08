'use strict';
const assert = require('assert');
const notSoShallow = require('not-so-shallow');
const Promise = require('bluebird');
const util = require('./util');
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
        throw new Error('argument 1 \'message\' should be of type string');
    performTest(false, message, Assert.prototype.fail);
};

Assert.prototype.true = function(value, message) {
    if (typeof value !== 'boolean')
        throw new Error('value must be a boolean');
    if (message !== undefined && typeof message !== 'string')
        throw new Error('argument 2 \'message\' should be of type string');
    performTest(value === true, message, Assert.prototype.true, value, true, '===');
};

Assert.prototype.false = function(value, message) {
    if (typeof value !== 'boolean')
        throw new Error('value must be a boolean');
    if (message !== undefined && typeof message !== 'string')
        throw new Error('argument 2 \'message\' should be of type string');
    performTest(value === false, message, Assert.prototype.false, value, false, '===');
};

Assert.prototype.truthy = function(value, message) {
    if (message !== undefined && typeof message !== 'string')
        throw new Error('argument 2 \'message\' should be of type string');
    performTest(value, message, Assert.prototype.truthy, value, true, '==');
};

Assert.prototype.assert = function(value, message) {
    if (message !== undefined && typeof message !== 'string')
        throw new Error('argument 2 \'message\' should be of type string');
    performTest(value, message, Assert.prototype.assert, value, true, '==');
};

Assert.prototype.falsey = function(value, message) {
    if (message !== undefined && typeof message !== 'string')
        throw new Error('argument 2 \'message\' should be of type string');
    performTest(!value, message, Assert.prototype.falsey, value, false, '==');
};

Assert.prototype.equal = function(value, expected, message) {
    if (message !== undefined && typeof message !== 'string')
        throw new Error('argument 3 \'message\' should be of type string');
    performTest(value === expected, message, Assert.prototype.equal, value, expected, '===');
};
Assert.prototype.equals = function(value, expected, message) {
    if (message !== undefined && typeof message !== 'string')
        throw new Error('argument 3 \'message\' should be of type string');
    performTest(value === expected, message, Assert.prototype.equals, value, expected, '===');
};
Assert.prototype.is = function(value, expected, message) {
    if (message !== undefined && typeof message !== 'string')
        throw new Error('argument 3 \'message\' should be of type string');
    performTest(value === expected, message, Assert.prototype.is, value, expected, '===');
};

Assert.prototype.notEqual = function(value, expected, message) {
    if (message !== undefined && typeof message !== 'string')
        throw new Error('argument 3 \'message\' should be of type string');
    performTest(value !== expected, message, Assert.prototype.notEqual, value, expected, '!==');
};
Assert.prototype.not = function(value, expected, message) {
    if (message !== undefined && typeof message !== 'string')
        throw new Error('argument 3 \'message\' should be of type string');
    performTest(value !== expected, message, Assert.prototype.not, value, expected, '!==');
};
Assert.prototype.notEquals = function(value, expected, message) {
    if (message !== undefined && typeof message !== 'string')
        throw new Error('argument 3 \'message\' should be of type string');
    performTest(value !== expected, message, Assert.prototype.notEquals, value, expected, '!==');
};

Assert.prototype.deepEqual = function(value, expected, message) {
    if (message !== undefined && typeof message !== 'string')
        throw new Error('argument 3 \'message\' should be of type string');
    performTest(notSoShallow(value, expected), message, Assert.prototype.deepEqual, value, expected, 'deepEqual');
};

Assert.prototype.notDeepEqual = function(value, expected, message) {
    if (message !== undefined && typeof message !== 'string')
        throw new Error('argument 3 \'message\' should be of type string');
    performTest(!notSoShallow(value, expected), message, Assert.prototype.notDeepEqual, value, expected, '!deepEqual');
};

Assert.prototype.greaterThan = function(value, expected, message) {
    if (message !== undefined && typeof message !== 'string')
        throw new Error('argument 3 \'message\' should be of type string');
    performTest(value > expected, message, Assert.prototype.deepEqual, value, expected, '>');
};

Assert.prototype.greaterThanOrEqual = function(value, expected, message) {
    if (message !== undefined && typeof message !== 'string')
        throw new Error('argument 3 \'message\' should be of type string');
    performTest(value >= expected, message, Assert.prototype.greaterThanOrEqual, value, expected, '>=');
};

Assert.prototype.lessThan = function(value, expected, message) {
    if (message !== undefined && typeof message !== 'string')
        throw new Error('argument 3 \'message\' should be of type string');
    performTest(value < expected, message, Assert.prototype.deepEqual, value, expected, '<');
};

Assert.prototype.lessThanOrEqual = function(value, expected, message) {
    if (message !== undefined && typeof message !== 'string')
        throw new Error('argument 3 \'message\' should be of type string');
    performTest(value <= expected, message, Assert.prototype.lessThanOrEqual, value, expected, '<=');
};

Assert.prototype.noError = function(value, message) {
    if (message !== undefined && typeof message !== 'string')
        throw new Error('argument 2 \'message\' should be of type string');
    performTest(!value, message, Assert.prototype.noError, value, 'Error', '!==');
};

Assert.prototype.failure = function(fn) {
    this._test._validateFailure = fn;
};

//This will handle fn synchronously if at all possible. It will only revert to asynchronous execution if necessary.
// It's necessary only if fn() returns a Promise or the callback is not executed synchronously.
function runHandler(fn) {
    if (fn.length === 1) {
        let executed, err;
        const promise = new Promise((resolve, reject) => {
            //execute fn with a callback
            fn(err2 => {
                if (executed)
                    return;
                
                executed = true;
                err = err2;
                if (err2)
                    reject(err2);
                else
                    resolve();
            });
        });
        
        if (executed) { //callback was executed synchronously
            promise.suppressUnhandledRejections();
            if (err)
                throw err;
        } else {
            return promise;
        }
    } else {
        return fn();
    }
    
    return undefined;
}

Assert.prototype.throws = function(fn, ...args) {
    if (typeof fn !== 'function')
        throw new Error('argument 1 \'fn\' should be of type function');
    
    if (fn.length > 1)
        throw new Error('argument 1 \'fn\' should have 0 or 1 argument');
    
    let testErrorFn, message;
    
    switch (args.length) {
        case 2:
            testErrorFn = args[0];
            message = args[1];
            
            if (typeof testErrorFn !== 'function')
                throw new Error('argument 2 \'testErrorFn\' should be of type function');
            
            if (typeof testErrorFn !== 'string')
                throw new Error('argument 3 \'message\' should be of type string');
            break;
        
        case 1:
            switch (typeof args[0]) {
                case 'string':
                    message = args[0];
                    break;
                case 'function':
                    testErrorFn = args[0];
                    break;
                default:
                    throw new Error('argument 2 should be of type function or string');
            }
            break;
        
        case 0:
            break;
        
        default:
            throw new Error('invalid function call');
    }
    let result;
    
    try {
        result = runHandler(fn);
        
    } catch (err) {
        if (testErrorFn) {
            const result2 = testErrorFn(err);
            if (util.isPromise(result2))
                this._test.addPromise(result2);
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
        this._test.addPromise(handled);
    }
};

Assert.prototype.notThrows = function(fn, message) {
    if (typeof fn !== 'function')
        throw new Error('argument 1 \'fn\' should be of type function');
    
    if (fn.length > 1)
        throw new Error('argument 1 \'fn\' should have 0 or 1 argument')

    if (message !== undefined && typeof message !== 'string')
        throw new Error('argument 2 \'message\' should be of type string');
    
    let result;
    try {
        result = runHandler(fn);
        
    } catch (err) {
        if (err instanceof assert.AssertionError)
            throw err;
        
        message = message || 'Unexpected Error was thrown';
        performTest(false, message, Assert.prototype.notThrows);
        return;
    }
    
    if (util.isPromise(result))
        this._test.addPromise(result);
};

Assert.prototype.count = function(fn, count, message) {
    if (typeof fn !== 'function')
        throw new Error('argument 1 \'fn\' should be of type function');
    
    if (fn.length !== 1)
        throw new Error('argument 1 \'fn\' should have 1 argument');
    
    if (typeof count !== 'number')
        throw new Error('argument 2 \'count\' should be of type number');

    if (message !== undefined && typeof message !== 'string')
        throw new Error('argument 3 \'message\' should be of type string');
    
    const p = new Promise((resolve, reject) => {
        let c = 0, fulfilled = false;
        const callback = () => {
            if (fulfilled)
                throw new Error('callback executed after test completed');
            
            c++;
            if (c === count) {
                //We want to give other code a chance to run and call the callback too many times (if it's going to).
                // So, make sure the count hasn't changed for a tick before resolving.
                const c2 = c;
                timers.setImmediate(() => {
                    if (c2 === c) { //make sure the count hasn't changed
                        fulfilled = true;
                        resolve();
                    }
                });
                
            } else if (c > count) {
                fulfilled = true;
                reject(new assert.AssertionError({
                    actual: c,
                    expected: count,
                    operator: '===',
                    message: message,
                    stackStartFunction: Assert.prototype.async
                }));
            }
        };
        try {
            fn(callback);
        } catch (err) {
            fulfilled = true;
            reject(err);
        }
    });
    
    this._test.addPromise(p);
};

module.exports = Assert;
