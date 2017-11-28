'use strict';
const Suite = require('../lib/suite');

const suite = new Suite('asynchronous & serial');

let count = 1;

suite.test('asynchronous test', t => {
    return Promise.delay(10)
        .then(() => {
            t.equal(count++, 3);
        });
});

suite.serial.test('serial 1', t => {
    return Promise.delay(300)
        .then(() => {
            t.equal(count++, 1);
        });
});

suite.serial.test('serial 2', t => {
    return Promise.delay(100)
        .then(() => {
            t.equal(count++, 2);
        });
});

suite.after(t => {
    t.equal(count, 4);
});