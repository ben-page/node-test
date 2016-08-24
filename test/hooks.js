'use strict';
const Suite = require('../lib/suite');

const suite = new Suite('beforeEach & afterEach');

let one, two;

suite.beforeEach(t => {
    return { init: true };
});

suite.afterEach((t, state) => {
    state.complete = true;
});

suite.test('first', (t, state) => {
    t.equal(state.init, true);
    t.falsey(state.complete);
    one = state;
    state.start = true;
});

suite.test('second', (t, state) => {
    t.equal(state.init, true);
    t.falsey(state.complete);
    two = state;
    state.start = true;
});

suite.after(t => {
    t.equal(one.init, true);
    t.equal(one.start, true);
    t.equal(one.complete, true);
    t.equal(two.init, true);
    t.equal(two.start, true);
    t.equal(two.complete, true);
});