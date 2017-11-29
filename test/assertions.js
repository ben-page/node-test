'use strict';
process.on('unhandledRejection', err => {
    console.error(err.stack);
});

const Suite = require('../lib/suite');
const promise = require('../lib/promise');

const suite = new Suite('Assertions Testing');
suite.config({timeout: 1000});

suite.only('uncaught', t => {
    // setTimeout(() => {
        setTimeout(() => {
            throw new Error('err');
        }, 100);
    // }, 100);
});

suite.test('t.is()', t => {
    t.is(1, 1);
    t.throws(() => {
        t.is(1, 5);
    });
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

suite.test('t.assert()', t => {
    t.assert(1);
});

suite.test('t.equal()', t => {
    t.equal(1, 1);
});

suite.test('t.equals()', t => {
    t.equals(2, 2);
});

suite.test('t.notEqual()', t => {
    t.notEqual(1, 2);
});

suite.test('t.notEquals()', t => {
    t.notEquals(1, 2);
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

suite.test('done()', (t, done) => {
    setTimeout(() => {
        done();
    }, 200);
});

suite.test('t.throws() synchronous', t => {
    t.throws(() => {
        throw new Error('error');
    });
});

suite.test('t.throws() asynchronous', async t => {
    await t.throws(async () => {
        await promise.delay(100);
        throw new Error('error');
    });
});

suite.test('t.throws() failures', async t => {
    await t.throws(async () => {
        await promise.delay(100);
        return true;
    });
},
(err, t) => {
    t.equal(err.message, 'Expected Error but none was thrown');
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

suite.test('t.throws() - with test callback', (t, done) => {
    t.throws(done2 => {
        done2();
        done();
    });
});

suite.test('t.throws() - with callback', t => {
    t.throws(done => {
        done();
    });
});

suite.test('t.throws() - with callback error', async t => {
    await t.throws(async () => {
        await t.throws(async done => {
            done(new Error('error'));
        });
    });
});

suite.test('t.notThrows() - with test callback', async (t, done) => {
    await t.notThrows(done2 => {
        done2();
        done();
    });
});

suite.test('t.notThrows() synchronous', t => {
    t.notThrows(() => {
        //no error
    });
});

suite.test('t.notThrows() failure', t => {
    t.notThrows(() => {
        t.equals(1, 2);
    });
},
(err, t) => {
    t.equals(err.message, '1 === 2');
});

suite.test('t.notThrows() asynchronous', async t => {
    await t.notThrows(async () => {
        await promise.delay(100);
        return true;
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

suite.test('t.throws(fn, \'message\')', t => {
    t.throws(() => {
        t.fail()
    },
    'expected to throw');
},
(err, t) => {
    t.equals(err.message, 'expected to throw');
});

suite.test('t.throws(Promise.resolve())', t => {
    t.throws(() => {
        return Promise.resolve();
    },
    'expected to throw');
},
(err, t) => {
    t.equals(err.message, 'expected to throw');
});

suite.test('t.throws(Promise.reject())', async t => {
    await t.throws(() => {
        return Promise.reject(new Error('threw'));
    },
    err => {
        t.equals(err.message, 'threw');
    });
});

suite.test('t.throws() throw in test error func', async t => {
    await t.throws(() => {
        return Promise.reject(new Error('expected'));
    },
    err => {
        t.equals(err.message, 'unexpected');
    });
},
(err, t) => {
    t.equals(err.message, '\'expected\' === \'unexpected\'');
});

suite.test('t.throws() promise in test error func', async t => {
    await t.throws(() => {
            return Promise.reject(new Error('threw'));
        },
        err => {
            return Promise.reject(new Error('threw 2'));
        });
},
(err, t) => {
    t.equals(err.message, 'threw 2');
});

suite.test('t.throws() is sync, but test error func is async', async t => {
    await t.throws(() => {
        throw new Error('threw');
    },
    err => {
        return Promise.reject(new Error('threw 2'));
    });
},
(err, t) => {
    t.equals(err.message, 'threw 2');
});

suite.test('t.async()', (t, done) => {
    setTimeout(t.async(() => {
        t.pass();
        done();
    }), 100);
});

suite.test('t.async() w/ error', (t, done) => {
    setTimeout(t.async(() => {
        t.fail();
        done();
    }), 100);
},
(err, t) => {
    t.equals(err.message, 'failed');
});

suite.test('t.async() w/ node style callback', (t, done) => {
    
    function funcWithAsyncCallback(cb) {
        setTimeout(() => cb(undefined, 1), 100);
    }
    
    funcWithAsyncCallback(t.async((err, result) => {
        t.noError(err);
        t.equals(1, result);
        done();
    }));
});

suite.test('t.async()', t => {
    const count = t.async(2);
    count();
    count();
});

suite.test('t.async() - called too many times', t => {
    const count = t.async(2);
    count();
    count();
    count();
},
(err, t) => {
    t.equal(err.message, 'count exceeded');
});

suite.test('t.async() - called too few times', t => {
    const count = t.async(3);
    count();
    count();
},
(err, t) => {
    t.true(err instanceof Promise.TimeoutError);
});


suite.test('promise reject non-error', t => {
    return Promise.reject('string');
},
(err, t) => {
    t.true(err.message === 'string');
});
