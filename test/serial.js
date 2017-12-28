'use strict';
const Suite = require('../lib/Suite');
const t = require('../lib/assert');
const promise = require('../lib/promise');

const suite = new Suite('asynchronous & serial');

let count = 1;

suite.before(() => {
    t.equal(count, 1);
});

suite.test('asynchronous test', () => {
    return promise.delay(10)
        .then(() => {
            t.equal(count++, 3);
        });
});

suite.serial.test('serial 1', () => {
    return promise.delay(300)
        .then(() => {
            t.equal(count++, 1);
        });
});

suite.serial.test('serial 2', () => {
    return promise.delay(100)
        .then(() => {
            t.equal(count++, 2);
        });
});

suite.after(() => {
    t.equal(count, 4);
});