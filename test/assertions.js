'use strict';
const Promise = require('bluebird');
Promise.config({
    warnings: true,
    longStackTraces: true
});
const Suite = require('../lib/suite');

const suite = new Suite('Assertions Testing');
suite.setTimeout(1000);

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

suite.test('t.throws() failures', t => {
    t.throws(() => {
        return Promise.delay(100).return(Promise.resolve(true));
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

suite.test('t.throws() - with callback', t => {
    t.throws(done => {
        done();
    });
});

suite.test('t.throws() - with callback error', t => {
    t.throws(() => {
        t.throws(done => {
            done(new Error('error'));
        });
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

suite.test('t.throws(Promise.reject())', t => {
    t.throws(() => {
        return Promise.reject(new Error('threw'));
    },
    err => {
        t.equals(err.message, 'threw');
    });
});

suite.test('t.throws() throw in test error func', t => {
    t.throws(() => {
        return Promise.reject(new Error('threw'));
    },
    err => {
        t.equals(err.message, 'threw 2');
    });
},
(err, t) => {
    t.equals(err.message, '\'threw\' === \'threw 2\'');
});

suite.test('t.throws() promise in test error func', t => {
    t.throws(() => {
        return Promise.reject(new Error('threw'));
    },
    err => {
        return Promise.reject(new Error('threw 2'));
    });
},
(err, t) => {
    t.equals(err.message, 'threw 2');
});

suite.test('t.throws() is sync, but test error func is async', t => {
    t.throws(() => {
        throw new Error('threw');
    },
    err => {
        return Promise.reject(new Error('threw 2'));
    });
},
(err, t) => {
    t.equals(err.message, 'threw 2');
});

suite.test('t.count()', t => {
    t.count(done => {
        done();
        done();
    }, 2)
});

suite.test('t.count() - called too many times', t => {
    t.count(done => {
        done();
        done();
        done();
    }, 2)
},
(err, t) => {
    t.equal(err.message, 'count exceeded');
});

suite.test('t.count() - called too few times', t => {
    t.count(done => {
        done();
        done();
    }, 3)
},
(err, t) => {
    t.true(err instanceof Promise.TimeoutError);
});