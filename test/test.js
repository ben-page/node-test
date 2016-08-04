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
    
    suite.test('t.is()', t => {
        t.is(1, 1);
        t.throws(() => {
            t.is(1, 5);
        });
    });
    
    suite.todo('something todo', t => {
        assert(false);
    });
    
    suite.skip('skipped', t => {
        assert(false);
    });
    
    suite.failing('fail()', t => {
        t.fail('something bad happened');
    });
    
    suite.test('t.not()', t => {
        t.not(1, 5);
        t.throws(() => {
            t.not(1, 1);
        });
    });
    
    suite.test('t.true()', t => {
        t.true(true);
        t.throws(() => {
            t.true(false);
        });
    });
    
    suite.test('t.false()', t => {
        t.false(false);
        t.throws(() => {
            t.false(true);
        });
    });
    
    suite.test('t.truthy()', t => {
        t.truthy(1);
        t.throws(() => {
            t.truthy(0);
        });
    });
    
    suite.test('t.falsey()', t => {
        t.falsey(0);
        t.throws(() => {
            t.falsey(1);
        });
    });
    
    suite.test('t.deepEqual()', t => {
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
    });
    
    suite.test('t.notDeepEqual()', t => {
        t.notDeepEqual({a: 123}, {a: 1234});
        t.throws(() => {
            t.notDeepEqual({a: 123}, {a: 123});
        });
    });
    
    suite.test('t.greaterThan()', t => {
        t.greaterThan(5, 1);
        t.throws(() => {
            t.greaterThan(5, 10);
        });
    });
    
    suite.test('t.greaterThanOrEqual()', t => {
        t.greaterThanOrEqual(5, 5);
        t.throws(() => {
            t.greaterThanOrEqual(5, 10);
        });
    });
    
    suite.test('t.lessThan()', t => {
        t.lessThan(5, 10);
        t.throws(() => {
            t.lessThan(5, 1);
        });
    });
    
    suite.test('t.lessThanOrEqual()', t => {
        t.lessThanOrEqual(5, 5);
        t.throws(() => {
            t.lessThanOrEqual(5, 1);
        });
    });
    
    suite.test('done()', (t, state, done) => {
        setTimeout(() => {
            done();
        }, 200);
    });
    
    suite.test('t.throws() synchronous', t => {
        t.throws(() => {
            throw new Error('error');
        });
    });
    
    suite.test('t.throws() asynchronous', t => {
        t.throws(() => {
            return Promise.delay(100).return(Promise.reject(new Error('error')));
        });
    });
    
    suite.failing('t.throws() failures', t => {
        t.throws(() => {
            return Promise.delay(100).return(Promise.resolve(true));
        });
    });
    
    suite.test('t.throws() nested', t => {
        t.throws(() => {
            t.throws(() => {
                //no error, so first t.throws() asserts
            });
        });
    });
    
    suite.test('t.throws() with test', t => {
        t.throws(() => {
            throw new Error('error')
        },
        err => {
            t.true(err instanceof Error);
            t.equal(err.message, 'error');
        });
    });
    
    suite.test('t.notThrows() synchronous', t => {
        t.notThrows(() => {
            //no error
        });
    });
    
    suite.test('t.notThrows() asynchronous', t => {
        t.notThrows(() => {
            return Promise.delay(100).return(Promise.resolve(true));
        });
    });
    
    suite.test('t.notThrows() nested', t => {
        t.notThrows(() => {
            //no error
        });
        t.throws(() => {
            t.notThrows(() => {
                throw new Error('error');
            });
        });
    });
    
    suite.test('t.noError()', t => {
        
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
}

function suite2() {
    const suite = new Suite('Testing suite level hooks');
    
    let beforeAll = false;
    let testsCreated = 0;
    let testsComplete = 0;
    let afterAll = false;
    
    suite.before(t => {
        beforeAll = true;
        assert(t.equals);
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
}

function suite3() {
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
}

function suite4() {
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
}

function suite5() {
    const suite = new Suite('asynchronous & serial');
    
    let count = 1;
    
    suite.test('asynchronous test', t => {
        return Promise.delay(10)
            .then(() => {
                t.equal(count++, 3);
            });
    });
    
    suite.serial.test('serial 1', t => {
        return Promise.delay(300)
            .then(() => {
                t.equal(count++, 1);
            });
    });
    
    suite.serial.test('serial 2', t => {
        return Promise.delay(100)
            .then(() => {
                t.equal(count++, 2);
            });
    });
    
    suite.after(t => {
        t.equal(count, 4);
    })
}

function suite6() {
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
suite6();