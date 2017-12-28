'use strict';
const Suite = require('../lib/Suite');
const t = require('../lib/assert');

const suite = new Suite('Testing .only()');

let testsCreated = 0;
let testsComplete = 0;

suite.before(() => {
    t.equal(testsCreated, 0);
    t.equal(testsComplete, 0);
});

suite.test('fail', () => {
    testsCreated++;
    t.is(1, 2);
    testsComplete++;
});

suite.only('pass', () => {
    testsCreated++;
    t.is(1, 1);
    testsComplete++;
});

suite.after(() => {
    t.equal(testsCreated, 1);
    t.equal(testsComplete, 1);
});