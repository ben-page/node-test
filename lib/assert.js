'use strict';
const assert = require('assert');
const notSoShallow = require('not-so-shallow');
const Promise = require('bluebird');
const util = require('./util');

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
    performTest(false, message, Assert.prototype.fail);
};

Assert.prototype.true = function(value, message) {
    performTest(value === true, message, Assert.prototype.true, value, true, '===');
};

Assert.prototype.false = function(value, message) {
    performTest(value === false, message, Assert.prototype.false, value, false, '===');
};

Assert.prototype.truthy = function(value, message) {
    performTest(value, message, Assert.prototype.truthy, value, true, '==');
};

Assert.prototype.assert = function(value, message) {
    performTest(value, message, Assert.prototype.assert, value, true, '==');
};

Assert.prototype.falsey = function(value, message) {
    performTest(!value, message, Assert.prototype.falsey, value, false, '==');
};

Assert.prototype.equal = function(value, expected, message) {
    performTest(value === expected, message, Assert.prototype.equal, value, expected, '===');
};
Assert.prototype.equals = function(value, expected, message) {
    performTest(value === expected, message, Assert.prototype.equals, value, expected, '===');
};
Assert.prototype.is = function(value, expected, message) {
    performTest(value === expected, message, Assert.prototype.is, value, expected, '===');
};

Assert.prototype.notEqual = function(value, expected, message) {
    performTest(value !== expected, message, Assert.prototype.notEqual, value, expected, '!==');
};
Assert.prototype.not = function(value, expected, message) {
    performTest(value !== expected, message, Assert.prototype.not, value, expected, '!==');
};
Assert.prototype.notEquals = function(value, expected, message) {
    performTest(value !== expected, message, Assert.prototype.notEquals, value, expected, '!==');
};

Assert.prototype.deepEqual = function(value, expected, message) {
    performTest(notSoShallow(value, expected), message, Assert.prototype.deepEqual, value, expected, 'deepEqual');
};

Assert.prototype.notDeepEqual = function(value, expected, message) {
    performTest(!notSoShallow(value, expected), message, Assert.prototype.notDeepEqual, value, expected, '!deepEqual');
};

Assert.prototype.greaterThan = function(value, expected, message) {
    performTest(value > expected, message, Assert.prototype.deepEqual, value, expected, '>');
};

Assert.prototype.greaterThanOrEqual = function(value, expected, message) {
    performTest(value >= expected, message, Assert.prototype.greaterThanOrEqual, value, expected, '>=');
};

Assert.prototype.lessThan = function(value, expected, message) {
    performTest(value < expected, message, Assert.prototype.deepEqual, value, expected, '<');
};

Assert.prototype.lessThanOrEqual = function(value, expected, message) {
    performTest(value <= expected, message, Assert.prototype.lessThanOrEqual, value, expected, '<=');
};

Assert.prototype.noError = function(value, message) {
    performTest(!value, message, Assert.prototype.noError, value, 'Error', '!==');
};

Assert.prototype.throws = function(fn, ...args) {
    if (typeof fn !== 'function')
        throw new Error('argument 1 \'fn\' should be of type function');
    
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
    
    try {
        const result = fn();
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
    } catch(err) {
        if (testErrorFn) {
            const result = testErrorFn(err);
            if (util.isPromise(result))
                this._test.addPromise(result);
        }
    }
};

Assert.prototype.notThrows = function(fn, message) {
    if (typeof fn !== 'function')
        throw new Error('throws only access functions');
    try {
        const result = fn();
        if (util.isPromise(result))
            this._test.addPromise(result);
        
    } catch (err) {
        if (err instanceof assert.AssertionError)
            throw err;
        
        message = message || 'Unexpected Error was thrown';
        performTest(false, message, Assert.prototype.notThrows);
    }
};

Assert.prototype.async = function(fn, count, message) {
    this._test.addAsyncAssertion(fn, count, message);
};

module.exports = Assert;
