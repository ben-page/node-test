'use strict';
const Suite = require('../lib/suite');

const suite = new Suite('Testing .only()');

let testsCreated = 0;
let testsComplete = 0;

suite.before(t => {
    t.equal(testsCreated, 0);
    t.equal(testsComplete, 0);
});

suite.test('fail', t => {
    testsCreated++;
    t.is(1, 2);
    testsComplete++;
});

suite.only('pass', t => {
    testsCreated++;
    t.is(1, 1);
    testsComplete++;
});

suite.after(t => {
    t.equal(testsCreated, 1);
    t.equal(testsComplete, 1);
});