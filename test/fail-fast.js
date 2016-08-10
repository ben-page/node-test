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

suite.after(t => {
    t.equals(suite._test[0]._report.status, 'pass');
    t.equals(suite._test[1]._report.status, 'fail');
    t.equals(suite._test[2]._report.status, 'stop');
});