'use strict';
const Suite = require('./lib/suite');
const Promise = require('bluebird');

function funcReturnsPromise() {
    return Promise.delay(100).return(2);
}

function funcWithCallback(cb) {
    setTimeout(cb, 100);
}

const suite = new Suite('My Suite Name');
suite.test('Test 1', t => {
    return funcReturnsPromise()
        .then(result => {
            t.equal(result, 2);
        });
});

suite.skip('Test 2', t => {
    throw new Error('skipped');
});

suite.todo('Test 3 - Coming Soon');

suite.test('Test 4', (t, state, done) => {
    funcWithCallback(done);
});

suite.failing('Test 5 - Need to fix this', t => {
    t.equal(1+1, 3);
});
