'use strict';
const Promise = require('bluebird');
Promise.config({
    warnings: true,
    longStackTraces: true
});
const Suite = require('../lib/suite');

const suite = new Suite('fail fast serial', { failFast: true });

suite.serial.test('pass', t => {
    t.equal(1, 1);
});

suite.serial.test('fail', t => {
    t.equal(1, 2);
});

suite.serial.test('stop', t => {
    return Promise.delay(100)
        .then(() => {
            t.equal(1, 1);
        });
});