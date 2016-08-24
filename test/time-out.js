'use strict';
const Promise = require('bluebird');
const Suite = require('../lib/suite');

const suite = new Suite('timeout tests');
suite.config({ timeout: 1000 });

suite.test('no time out', t => {
    t.notThrows(() => {
        return Promise.delay(800);
    });
});

suite.test('timed out', t => {
    t.notThrows(() => {
        return Promise.delay(1200);
    });
},
(err, t) => {
    t.true(err instanceof Promise.TimeoutError);
});
