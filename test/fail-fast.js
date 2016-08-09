'use strict';
const Promise = require('bluebird');
Promise.config({
    warnings: true,
    longStackTraces: true
});
const Suite = require('../lib/suite');

const suite = new Suite('fail fast', { failFast: true });

suite.test('pass', t => {
    t.equal(1, 1);
});

suite.test('fail', t => {
    t.fail();
});

suite.test('stop', t => {
    return Promise.delay(100)
        .then(() => {
            t.equal(1, 1);
        });
});