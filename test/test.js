'use strict';
const Suite = require('../lib/suite');
const Promise = require('bluebird');
const assert = require('assert');

function suite1() {
    const suite = new Suite('General Testing');
    
    let beforeAll = false;
    let testsCreated = 0;
    let testsComplete = 0;
    let afterAll = false;
    
    suite.before(() => {
        beforeAll = true;
        assert.strictEqual(afterAll, false);
        assert.strictEqual(testsCreated, 0);
        assert.strictEqual(testsComplete, 0);
    });
    
    suite.test('t.is()', t => {
        testsCreated++;
        t.is(1, 1);
        assert.throws(() => {
            t.is(1, 5);
        });
        testsComplete++;
    });
    
    suite.todo('something todo', t => {
        assert(false);
    });
    
    suite.skip('skipped', t => {
        assert(false);
    });
    
    suite.failing('fail()', t => {
        testsCreated++;
        t.fail('something bad happened');
        testsComplete++;
    });
    
    suite.test('t.not()', t => {
        testsCreated++;
        t.not(1, 5);
        assert.throws(() => {
            t.not(1, 1);
        });
        testsComplete++;
    });
    
    suite.test('t.true()', t => {
        testsCreated++;
        t.true(true);
        assert.throws(() => {
            t.true(false);
        });
        testsComplete++;
    });
    
    suite.test('t.false()', t => {
        testsCreated++;
        t.false(false);
        assert.throws(() => {
            t.false(true);
        });
        testsComplete++;
    });
    
    suite.test('t.truthy()', t => {
        testsCreated++;
        t.truthy(1);
        assert.throws(() => {
            t.truthy(0);
        });
        testsComplete++;
    });
    
    suite.test('t.falsey()', t => {
        testsCreated++;
        t.falsey(0);
        assert.throws(() => {
            t.falsey(1);
        });
        testsComplete++;
    });
    
    suite.test('t.deepEqual()', t => {
        testsCreated++;
        t.deepEqual(
            {
                a: {
                    b: 123,
                    c: [
                        new Date(2016, 1, 1, 1, 1, 1)
                    ]
                }
            },
            {
                a: {
                    b: 123,
                    c: [
                        new Date(2016, 1, 1, 1, 1, 1)
                    ]
                }
            });
        assert.throws(() => {
            t.deepEqual(
                {
                    a: {
                        b: 123,
                        c: [
                            new Date(2016, 1, 1, 1, 1, 1)
                        ]
                    }
                },
                {
                    a: {
                        b: 1234,
                        c: [
                            new Date(2016, 1, 1, 1, 1, 1)
                        ]
                    }
                });
        });
        testsComplete++;
    });
    
    suite.test('t.notDeepEqual()', t => {
        testsCreated++;
        t.notDeepEqual({a: 123}, {a: 1234});
        assert.throws(() => {
            t.notDeepEqual({a: 123}, {a: 123});
        });
        testsComplete++;
    });
    
    suite.test('t.greaterThan()', t => {
        testsCreated++;
        t.greaterThan(5, 1);
        assert.throws(() => {
            t.greaterThan(5, 10);
        });
        testsComplete++;
    });
    
    suite.test('t.greaterThanOrEqual()', t => {
        testsCreated++;
        t.greaterThanOrEqual(5, 5);
        assert.throws(() => {
            t.greaterThanOrEqual(5, 10);
        });
        testsComplete++;
    });
    
    suite.test('t.lessThan()', t => {
        testsCreated++;
        t.lessThan(5, 10);
        assert.throws(() => {
            t.lessThan(5, 1);
        });
        testsComplete++;
    });
    
    suite.test('t.lessThanOrEqual()', t => {
        testsCreated++;
        t.lessThanOrEqual(5, 5);
        assert.throws(() => {
            t.lessThanOrEqual(5, 1);
        });
        testsComplete++;
    });
    
    suite.after(() => {
        assert.strictEqual(afterAll, false);
        assert.strictEqual(beforeAll, true);
        assert.strictEqual(testsCreated, 13);
        assert.strictEqual(testsComplete, 12);
        afterAll = true;
    });
}

function suite2() {
    const suite = new Suite('Testing .only()');
    
    let testsCreated = 0;
    let testsComplete = 0;
    
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
    
    suite.after(() => {
        assert.strictEqual(testsCreated, 1);
        assert.strictEqual(testsComplete, 1);
    });
}

function suite3() {
    const suite = new Suite('beforeEach & afterEach');
    
    let one, two;
    
    suite.beforeEach(() => {
        return { init: true };
    });
    
    suite.afterEach((t, state) => {
        state.complete = true;
    });
    
    suite.test('first', (t, state) => {
        one = state;
        state.start = true;
    });
    
    suite.test('second', (t, state) => {
        two = state;
        state.start = true;
    });
    
    suite.after(() => {
        assert.strictEqual(one.init, true);
        assert.strictEqual(one.start, true);
        assert.strictEqual(one.complete, true);
        assert.strictEqual(two.init, true);
        assert.strictEqual(two.start, true);
        assert.strictEqual(two.complete, true);
    });
}

function suite4() {
    const suite = new Suite('asynchronous & serial');
    
    let testsCreated = 0;
    let testsComplete = 0;
    
    suite.test('asynchronous test', t => {
        testsCreated++;
        return Promise.delay(10)
            .then(() => {
                testsComplete++;
                assert.strictEqual(testsCreated, 3);
                assert.strictEqual(testsComplete, 3);
            });
    });
    
    suite.serial.test('serial 1', t => {
        testsCreated++;
        return Promise.delay(300)
            .then(() => {
                testsComplete++;
                assert.strictEqual(testsCreated, 1);
                assert.strictEqual(testsComplete, 1);
            });
    });
    
    suite.serial.test('serial 2', t => {
        testsCreated++;
        return Promise.delay(100)
            .then(() => {
                testsComplete++;
                assert.strictEqual(testsCreated, 2);
                assert.strictEqual(testsComplete, 2);
            });
    });

    suite.after(() => {
        assert.strictEqual(testsCreated, 3);
        assert.strictEqual(testsComplete, 3);
    });
}

suite1();
suite2();
suite3();
suite4();