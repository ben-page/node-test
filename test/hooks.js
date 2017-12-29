'use strict';
const Suite = require('../lib/Suite');
const t = require('../lib/assert');

const suite = new Suite('beforeEach & afterEach');

let one, two;

suite.beforeEach(() => {
    return { init: true };
});

suite.afterEach(state => {
    state.complete = true;
});

suite.serial.test('first', state => {
    t.equal(state.init, true);
    t.falsey(state.complete);
    one = state;
    state.start = true;
});

suite.serial.test('second', state => {
    t.equal(state.init, true);
    t.falsey(state.complete);
    two = state;
    state.start = true;
});

suite.after(() => {
    t.equal(one.init, true);
    t.equal(one.start, true);
    t.equal(one.complete, true);
    t.equal(two.init, true);
    t.equal(two.start, true);
    t.equal(two.complete, true);
});