'use strict';
const Suite = require('../lib/Suite');
const t = require('../lib/assert');
const promise = require('../lib/promise');

const suite = new Suite('Assertions Testing');
suite.config({timeout: 1000});

suite.test('t.is()', () => {
    t.is(1, 1);
    // t.throws(() => {
    //     t.is(1, 5);
    // });
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

suite.test('uncaught error', () => {
    setTimeout(() => {
        t.fail('uncaught');
    }, 100);
},
err => {
    t.equals(err.message, '[Uncaught Exception] uncaught');
});

suite.test('uncaught rejection', () => {
    new Promise((resolve, reject) => {
        setTimeout(() => {
            reject(new Error('uncaught'));
        }, 100);
    });
},
err => {
    t.equals(err.message, '[Unhandled Rejection] uncaught');
});

suite.test('uncaught rejection 2', () => {
    setTimeout(() => {
        // noinspection JSIgnoredPromiseFromCall
        const f = new Error('uncaught');
        Promise.reject(f);
    }, 100);
},
err => {
    t.equals(err.message, '[Unhandled Rejection] uncaught');
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

suite.test('t.count() - called too few times', async () => {
    await t.count(cb => {
        cb();
        cb();
    }, 3);
},
err => {
    t.true(err instanceof promise.PromiseTimeoutError);
});

//
// suite.test('promise reject non-error', () => {
// // eslint-disable-next-line no-throw-literal
//     throw 'string';
// },
// err => {
//     t.true(err === 'string');
// });
