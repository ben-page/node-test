'use strict';
const Promise = require('bluebird');
Promise.config({
    warnings: true,
    longStackTraces: true
});
const Suite = require('../lib/suite');
const assert = require('assert');

function suite1() {
    const suite = new Suite('General Testing');
    
    let beforeAll = false;
    let testsCreated = 0;
    let testsComplete = 0;
    let afterAll = false;
    
    suite.before(t => {
        beforeAll = true;
        assert(t.equals);
        assert.equal(afterAll, false);
        assert.equal(testsCreated, 0);
        assert.equal(testsComplete, 0);
    });
    
    suite.test('t.is()', t => {
        testsCreated++;
        t.is(1, 1);
        t.throws(() => {
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
        t.throws(() => {
            t.not(1, 1);
        });
        testsComplete++;
    });
    
    suite.test('t.true()', t => {
        testsCreated++;
        t.true(true);
        t.throws(() => {
            t.true(false);
        });
        testsComplete++;
    });
    
    suite.test('t.false()', t => {
        testsCreated++;
        t.false(false);
        t.throws(() => {
            t.false(true);
        });
        testsComplete++;
    });
    
    suite.test('t.truthy()', t => {
        testsCreated++;
        t.truthy(1);
        t.throws(() => {
            t.truthy(0);
        });
        testsComplete++;
    });
    
    suite.test('t.falsey()', t => {
        testsCreated++;
        t.falsey(0);
        t.throws(() => {
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
        t.throws(() => {
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
        t.throws(() => {
            t.notDeepEqual({a: 123}, {a: 123});
        });
        testsComplete++;
    });
    
    suite.test('t.greaterThan()', t => {
        testsCreated++;
        t.greaterThan(5, 1);
        t.throws(() => {
            t.greaterThan(5, 10);
        });
        testsComplete++;
    });
    
    suite.test('t.greaterThanOrEqual()', t => {
        testsCreated++;
        t.greaterThanOrEqual(5, 5);
        t.throws(() => {
            t.greaterThanOrEqual(5, 10);
        });
        testsComplete++;
    });
    
    suite.test('t.lessThan()', t => {
        testsCreated++;
        t.lessThan(5, 10);
        t.throws(() => {
            t.lessThan(5, 1);
        });
        testsComplete++;
    });
    
    suite.test('t.lessThanOrEqual()', t => {
        testsCreated++;
        t.lessThanOrEqual(5, 5);
        t.throws(() => {
            t.lessThanOrEqual(5, 1);
        });
        testsComplete++;
    });
    
    suite.test('done()', (t, state, done) => {
        testsCreated++;
        setTimeout(() => {
            testsComplete++;
            done();
        }, 200);
    });
    
    suite.test('t.throws()', t => {
        testsCreated++;
        t.throws(() => {
            throw new Error('error');
        });
        t.throws(() => {
            t.throws(() => {
                //no error
            });
        });
        testsComplete++;
    });
    
    suite.test('t.notThrows()', t => {
        testsCreated++;
        t.notThrows(() => {
            //no error
        });
        t.throws(() => {
            t.notThrows(() => {
                throw new Error('error');
            });
        });
        testsComplete++;
    });
    
    suite.test('t.noError()', t => {
        testsCreated++;
        
        function callbackWithError(cb) {
            cb(new Error());
        }
        
        function callbackWithoutError(cb) {
            cb(undefined);
        }
    
        callbackWithoutError(t.noError);
        t.throws(() => {
            callbackWithError(t.noError);
        });
        testsComplete++;
    });
    
    suite.test('t.async() - Promise Pass', t => {
        t.async(() => {
            return Promise.delay(0);
        });
    });
    
    suite.failing('t.async() - Promise Fail', t => {
        t.async(() => {
            return Promise.delay(0)
                .then(() => {
                    throw new Error();
                });
        });
    });
    
    suite.test('t.async() - Callback Pass', t => {
        t.async(done => {
            done();
        });
    });
    
    suite.failing('t.async() - Callback Fail', t => {
        t.async(done => {
            throw new Error();
        });
    });
    
    suite.test('t.async() - Callback Count Pass', t => {
        t.async(done => {
            done();
            done();
        }, 2);
    });
    
    suite.failing('t.async() - Callback Count Fail', t => {
        t.async(done => {
            done();
            done();
            done();
        }, 2);
    });
    
    suite.after(() => {
        assert.equal(afterAll, false);
        assert.equal(beforeAll, true);
        assert.equal(testsCreated, 17);
        assert.equal(testsComplete, 16);
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
        assert.equal(testsCreated, 1);
        assert.equal(testsComplete, 1);
    });
}

function suite3() {
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
    
    suite.after(() => {
        assert.equal(one.init, true);
        assert.equal(one.start, true);
        assert.equal(one.complete, true);
        assert.equal(two.init, true);
        assert.equal(two.start, true);
        assert.equal(two.complete, true);
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
                assert.equal(testsCreated, 3);
                assert.equal(testsComplete, 3);
            });
    });
    
    suite.serial.test('serial 1', t => {
        testsCreated++;
        return Promise.delay(300)
            .then(() => {
                testsComplete++;
                assert.equal(testsCreated, 1);
                assert.equal(testsComplete, 1);
            });
    });
    
    suite.serial.test('serial 2', t => {
        testsCreated++;
        return Promise.delay(100)
            .then(() => {
                testsComplete++;
                assert.equal(testsCreated, 2);
                assert.equal(testsComplete, 2);
            });
    });

    suite.after(() => {
        assert.equal(testsCreated, 3);
        assert.equal(testsComplete, 3);
    });
}

function suite5() {
    const suite = new Suite('timeout tests');
    suite.setTimeout(1000);
    
    suite.test('pass', t => {
        t.async(() => {
            return Promise.delay(800);
        });
    });
    
    suite.failing('fail', t => {
        t.async(() => {
            return Promise.delay(1200);
        });
    });
}

suite1();
suite2();
suite3();
suite4();
suite5();