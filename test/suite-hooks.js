'use strict';
const Suite = require('../lib/suite');

const suite = new Suite('Testing suite level hooks');

let beforeAll = false;
let testsCreated = 0;
let testsComplete = 0;
let afterAll = false;

suite.before(t => {
    beforeAll = true;
    t.false(afterAll);
    t.equal(testsCreated, 0);
    t.equal(testsComplete, 0);
});

suite.test('pass 1', t => {
    testsCreated++;
    t.is(1, 1);
    testsComplete++;
});

suite.test('pass 2', t => {
    testsCreated++;
    t.is(2, 2);
    testsComplete++;
});

suite.after(t => {
    t.true(beforeAll);
    t.false(afterAll);
    t.equal(testsCreated, 2);
    t.equal(testsComplete, 2);
    afterAll = true;
});