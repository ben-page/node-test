'use strict';
const Promise = require('bluebird');
Promise.config({
    warnings: true,
    longStackTraces: true
});
const Suite = require('../lib/suite');

const suite = new Suite('errors');

//use failure to test stack trace

suite.test('error message', t => {
    t.equal(1, 2, 'not equal!');
});

suite.test('no error message', t => {
    t.equal(1, 2);
});