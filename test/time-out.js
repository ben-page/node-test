'use strict';
const Suite = require('../lib/Suite');
const t = require('../lib/assert');
const promise = require('../lib/promise');

const suite = new Suite('timeout tests');
suite.config({ timeout: 1000 });

suite.test('no time out', () => {
    return promise.delay(800);
});

suite.test('timed out', () => {
    return promise.delay(1200);
},
err => {
    t.true(err instanceof promise.PromiseTimeoutError);
});
