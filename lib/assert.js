'use strict';
const assert = require('assert');
const notSoShallow = require('not-so-shallow');

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

Assert.prototype.throws = function(fn, message) {
    if (typeof fn !== 'function')
        throw new Error('throws only access functions');
    
    try {
        fn();
    } catch(err) {
        return;
    }
    
    performTest(false, message, Assert.prototype.throws, null, 'Error', '===');
};

Assert.prototype.notThrows = function(fn, message) {
    if (typeof fn !== 'function')
        throw new Error('throws only access functions');
    
    try {
        fn();
    } catch(err) {
        if (err instanceof assert.AssertionError)
            throw err;
        
        performTest(false, message, Assert.prototype.notThrows, null, 'Error', '!==');
    }
};

Assert.prototype.async = function(fn, count, message) {
    this._test.addAsyncAssertion(fn, count, message);
};

module.exports = Assert;
