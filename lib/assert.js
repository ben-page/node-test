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

function t(value, message) {
    performTest(value, message, t);
}

t.pass = function() {
    // performTest(true);
};

t.fail = function(message) {
    performTest(false, message, t.fail);
};

t.true = function(value, message) {
    performTest(value === true, message, t.true, value, true, '===');
};

t.false = function(value, message) {
    performTest(value === false, message, t.false, value, false, '===');
};

t.truthy = function(value, message) {
    performTest(value, message, t.truthy, value, true, '==');
};

t.falsey = function(value, message) {
    performTest(!value, message, t.falsey, value, false, '==');
};

t.equal = function(value, expected, message) {
    performTest(value === expected, message, t.equal, value, expected, '===');
};
t.equals = function(value, expected, message) {
    performTest(value === expected, message, t.equals, value, expected, '===');
};
t.is = function(value, expected, message) {
    performTest(value === expected, message, t.is, value, expected, '===');
};

t.notEqual = function(value, expected, message) {
    performTest(value !== expected, message, t.notEqual, value, expected, '!==');
};
t.not = function(value, expected, message) {
    performTest(value !== expected, message, t.not, value, expected, '!==');
};
t.notEquals = function(value, expected, message) {
    performTest(value !== expected, message, t.notEquals, value, expected, '!==');
};

t.deepEqual = function(value, expected, message) {
    performTest(notSoShallow(value, expected), message, t.deepEqual, value, expected, 'deepEqual');
};

t.notDeepEqual = function(value, expected, message) {
    performTest(!notSoShallow(value, expected), message, t.notDeepEqual, value, expected, '!deepEqual');
};

t.greaterThan = function(value, expected, message) {
    performTest(value > expected, message, t.deepEqual, value, expected, '>');
};

t.greaterThanOrEqual = function(value, expected, message) {
    performTest(value >= expected, message, t.greaterThanOrEqual, value, expected, '>=');
};

t.lessThan = function(value, expected, message) {
    performTest(value < expected, message, t.deepEqual, value, expected, '<');
};

t.lessThanOrEqual = function(value, expected, message) {
    performTest(value <= expected, message, t.lessThanOrEqual, value, expected, '<=');
};

// t.throws = function(fn, message) {
//
// };

module.exports = t;
