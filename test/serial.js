'use strict';
const Suite = require('../lib/Suite');

const suite = new Suite('asynchronous & serial');

let count = 1;

suite.test('asynchronous test', () => {
    return Promise.delay(10)
        .then(() => {
            t.equal(count++, 3);
        });
});

suite.serial.test('serial 1', () => {
    return Promise.delay(300)
        .then(() => {
            t.equal(count++, 1);
        });
});

suite.serial.test('serial 2', () => {
    return Promise.delay(100)
        .then(() => {
            t.equal(count++, 2);
        });
});

suite.after(() => {
    t.equal(count, 4);
});