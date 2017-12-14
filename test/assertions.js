'use strict';
// process.on('unhandledRejection', err => {
//     console.error(err.stack);
// });

const Suite = require('../lib/Suite');
const t = require('../lib/assert');
const promise = require('../lib/promise');

const suite = new Suite('Assertions Testing');
suite.config({timeout: 1000});

suite.test('t.is()', () => {
    t.is(1, 1);
    t.throws(() => {
        t.is(1, 5);
    });
});

suite.test('t.not()', () => {
    t.not(1, 5);
    t.throws(() => {
        t.not(1, 1);
    });
});

suite.test('t.true()', () => {
    t.true(true);
    t.throws(() => {
        t.true(false);
    });
});

suite.test('t.false()', () => {
    t.false(false);
    t.throws(() => {
        t.false(true);
    });
});

suite.test('t.truthy()', () => {
    t.truthy(1);
    t.throws(() => {
        t.truthy(0);
    });
});

suite.test('t.falsey()', () => {
    t.falsey(0);
    t.throws(() => {
        t.falsey(1);
    });
});

suite.test('t.assert()', () => {
    t.assert(1);
});

suite.test('t.equal()', () => {
    t.equal(1, 1);
});

suite.test('t.equals()', () => {
    t.equals(2, 2);
});

suite.test('t.notEqual()', () => {
    t.notEqual(1, 2);
});

suite.test('t.notEquals()', () => {
    t.notEquals(1, 2);
});

suite.test('t.deepEqual()', () => {
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

suite.test('t.notDeepEqual()', () => {
    t.notDeepEqual({a: 123}, {a: 1234});
    t.throws(() => {
        t.notDeepEqual({a: 123}, {a: 123});
    });
});

suite.test('t.greaterThan()', () => {
    t.greaterThan(5, 1);
    t.throws(() => {
        t.greaterThan(5, 10);
    });
});

suite.test('t.greaterThanOrEqual()', () => {
    t.greaterThanOrEqual(5, 5);
    t.throws(() => {
        t.greaterThanOrEqual(5, 10);
    });
});

suite.test('t.lessThan()', () => {
    t.lessThan(5, 10);
    t.throws(() => {
        t.lessThan(5, 1);
    });
});

suite.test('t.lessThanOrEqual()', () => {
    t.lessThanOrEqual(5, 5);
    t.throws(() => {
        t.lessThanOrEqual(5, 1);
    });
});

suite.test('done()', done => {
    setTimeout(() => {
        done();
    }, 200);
});

suite.test('t.throws() synchronous', () => {
    t.throws(() => {
        throw new Error('error');
    });
});

suite.test('t.throws() asynchronous', async () => {
    await t.throws(async () => {
        await promise.delay(100);
        throw new Error('error');
    });
});

suite.test('t.throws() failures', async () => {
    await t.throws(async () => {
        await promise.delay(100);
        return true;
    });
},
err => {
    t.equal(err.message, 'Expected Error but none was thrown');
});

suite.test('t.throws() nested', () => {
    t.throws(() => {
        t.throws(() => {
            //no error, so first t.throws() asserts
        });
    });
});

suite.test('t.throws() with test', () => {
    t.throws(() => {
        throw new Error('error');
    },
    err => {
        t.true(err instanceof Error);
        t.equal(err.message, 'error');
    });
});

suite.test('t.throws() - with test callback', done => {
    t.throws(done2 => {
        done2();
        done();
    });
});

suite.test('t.throws() - with callback', () => {
    t.throws(done => {
        done();
    });
});

suite.test('t.throws() - with callback error', async () => {
    await t.throws(async () => {
        await t.throws(done => {
            done(new Error('error'));
        });
    });
});

suite.test('t.noError()', () => {
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

suite.test('t.throws(fn, \'message\')', () => {
    t.throws(() => {
        t.fail();
    }, 'expected to throw');
},
err => {
    t.equals(err.message, 'expected to throw');
});

suite.test('t.throws(Promise.resolve())', () => {
    t.throws(() => {
        return Promise.resolve();
    },
    'expected to throw');
},
err => {
    t.equals(err.message, 'expected to throw');
});

suite.test('t.throws(Promise.reject())', async () => {
    await t.throws(() => {
        return Promise.reject(new Error('threw'));
    },
    err => {
        t.equals(err.message, 'threw');
    });
});

suite.test('t.throws() throw in test error func', async () => {
    await t.throws(() => {
        return Promise.reject(new Error('expected'));
    },
    err => {
        t.equals(err.message, 'unexpected');
    });
},
err => {
    t.equals(err.message, '\'expected\' === \'unexpected\'');
});

suite.test('t.throws() promise in test error func', async () => {
    await t.throws(() => {
        return Promise.reject(new Error('threw'));
    },
    err => {
        return Promise.reject(new Error('threw 2'));
    });
},
err => {
    t.equals(err.message, 'threw 2');
});

suite.test('t.throws() is sync, but test error func is async', async () => {
    await t.throws(() => {
        throw new Error('threw');
    },
    err => {
        return Promise.reject(new Error('threw 2'));
    });
},
err => {
    t.equals(err.message, 'threw 2');
});

suite.test('uncaught error', () => {
    setTimeout(() => {
        t.fail('uncaught');
    }, 100);
},
err => {
    t.equals(err.message, 'uncaught');
});

suite.test('uncaught rejection', () => {
    setTimeout(() => {
        // noinspection JSIgnoredPromiseFromCall
        Promise.reject(new Error('uncaught'));
    }, 100);
},
err => {
    t.equals(err.message, 'uncaught');
});

suite.test('t.count()', async () => {
    await t.count(cb => {
        cb();
        cb();
    }, 2);
});

suite.test('t.count() - called too many times', async () => {
    await t.count(cb => {
        cb();
        cb();
        cb();
    }, 2);
},
err => {
    t.equal(err.message, 'count exceeded');
});

suite.only('t.count() - called too few times', async () => {
    await t.count(cb => {
        cb();
        cb();
    }, 3);
},
err => {
    t.true(err instanceof Promise.TimeoutError);
});


suite.test('promise reject non-error', async () => {
    throw 'string';
},
err => {
    t.true(err === 'string');
});
