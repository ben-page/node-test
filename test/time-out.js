'use strict';
const Promise = require('bluebird');
Promise.config({
    warnings: true,
    longStackTraces: true
});
const Suite = require('../lib/suite');

const suite = new Suite('timeout tests');
suite.setTimeout(1000);

suite.test('no time out', t => {
    t.notThrows(() => {
        return Promise.delay(800);
    });
});

//this is not a great way to test this. it's not really testing for the timeout, just a failure.
suite.test('timed out', t => {
    t.notThrows(() => {
        return Promise.delay(1200);
    });

    t.failure(err => {
        t.assert(err.message, 'Timed Out');
    })
});