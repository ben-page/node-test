'use strict';
const Suite = require('../lib/Suite');
const t = require('../lib/assert');

const suite = new Suite('Testing suite level hooks');

let beforeAll = false;
let testsCreated = 0;
let testsComplete = 0;
let afterAll = false;

suite.before(() => {
    beforeAll = true;
    t.false(afterAll);
    t.equal(testsCreated, 0);
    t.equal(testsComplete, 0);
});

suite.test('pass 1', () => {
    testsCreated++;
    t.is(1, 1);
    testsComplete++;
});

suite.test('pass 2', () => {
    testsCreated++;
    t.is(2, 2);
    testsComplete++;
});

suite.after(() => {
    t.true(beforeAll);
    t.false(afterAll);
    t.equal(testsCreated, 2);
    t.equal(testsComplete, 2);
    afterAll = true;
});