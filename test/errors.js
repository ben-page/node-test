'use strict';
const Suite = require('../lib/Suite');
const t = require('../lib/assert');

const suite = new Suite('errors');

suite.test('error message', () => {
    t.throws(() => {
        t.equal(1, 2, 'not equal!');
    },
    err => {
        t.equal(err.message, 'not equal!');
        const lines = err.stack.split('\n');
        t.true(lines[1].indexOf(__filename) > -1);
    });
});

suite.test('no error message', () => {
    t.throws(() => {
        t.equal(1, 2);
    },
    err => {
        const lines = err.stack.split('\n');
        t.true(lines[1].indexOf(__filename) > -1);
    });
});

suite.test('validation fail()', () => {
    t.throws(() => {
        t.fail(1);
    },
    err => {
        t.equal(err.message, 'argument 1 \'message\' should be a string');
    });
});

suite.test('validation true()', () => {
    t.throws(() => {
        t.true(1);
    },
    err => {
        t.equal(err.message, 'argument 1 \'value\' should be a boolean');
    });
});

suite.test('validation true()', () => {
    t.throws(() => {
        t.true(true, 1);
    },
    err => {
        t.equal(err.message, 'argument 2 \'message\' should be a string');
    });
});

suite.test('validation false()', () => {
    t.throws(() => {
        t.false(1);
    },
    err => {
        t.equal(err.message, 'argument 1 \'value\' should be a boolean');
    });
});

suite.test('validation false()', () => {
    t.throws(() => {
        t.false(true, 1);
    },
    err => {
        t.equal(err.message, 'argument 2 \'message\' should be a string');
    });
});

suite.test('validation truthy()', () => {
    t.throws(() => {
        t.truthy(true, 1);
    },
    err => {
        t.equal(err.message, 'argument 2 \'message\' should be a string');
    });
});

suite.test('validation assert()', () => {
    t.throws(() => {
        t.assert(true, 1);
    },
    err => {
        t.equal(err.message, 'argument 2 \'message\' should be a string');
    });
});

suite.test('validation falsey()', () => {
    t.throws(() => {
        t.falsey(true, 1);
    },
    err => {
        t.equal(err.message, 'argument 2 \'message\' should be a string');
    });
});

suite.test('validation equal()', () => {
    t.throws(() => {
        t.equal(true, false, 1);
    },
    err => {
        t.equal(err.message, 'argument 3 \'message\' should be a string');
    });
});

suite.test('validation equals()', () => {
    t.throws(() => {
        t.equals(true, false, 1);
    },
    err => {
        t.equal(err.message, 'argument 3 \'message\' should be a string');
    });
});

suite.test('validation is()', () => {
    t.throws(() => {
        t.is(true, false, 1);
    },
    err => {
        t.equal(err.message, 'argument 3 \'message\' should be a string');
    });
});

suite.test('validation notEqual()', () => {
    t.throws(() => {
        t.notEqual(true, false, 1);
    },
    err => {
        t.equal(err.message, 'argument 3 \'message\' should be a string');
    });
});

suite.test('validation not()', () => {
    t.throws(() => {
        t.not(true, false, 1);
    },
    err => {
        t.equal(err.message, 'argument 3 \'message\' should be a string');
    });
});

suite.test('validation notEquals()', () => {
    t.throws(() => {
        t.notEquals(true, false, 1);
    },
    err => {
        t.equal(err.message, 'argument 3 \'message\' should be a string');
    });
});

suite.test('validation deepEqual()', () => {
    t.throws(() => {
        t.deepEqual(true, false, 1);
    },
    err => {
        t.equal(err.message, 'argument 3 \'message\' should be a string');
    });
});

suite.test('validation notDeepEqual()', () => {
    t.throws(() => {
        t.notDeepEqual(true, false, 1);
    },
    err => {
        t.equal(err.message, 'argument 3 \'message\' should be a string');
    });
});

suite.test('validation greaterThan()', () => {
    t.throws(() => {
        t.greaterThan(true, false, 1);
    },
    err => {
        t.equal(err.message, 'argument 3 \'message\' should be a string');
    });
});

suite.test('validation greaterThanOrEqual()', () => {
    t.throws(() => {
        t.greaterThanOrEqual(true, false, 1);
    },
    err => {
        t.equal(err.message, 'argument 3 \'message\' should be a string');
    });
});

suite.test('validation lessThan()', () => {
    t.throws(() => {
        t.lessThan(true, false, 1);
    },
    err => {
        t.equal(err.message, 'argument 3 \'message\' should be a string');
    });
});

suite.test('validation lessThanOrEqual()', () => {
    t.throws(() => {
        t.lessThanOrEqual(true, false, 1);
    },
    err => {
        t.equal(err.message, 'argument 3 \'message\' should be a string');
    });
});

suite.test('validation noError()', () => {
    t.throws(() => {
        t.noError(true, 1);
    },
    err => {
        t.equal(err.message, 'argument 2 \'message\' should be a string');
    });
});

suite.test('validation throws()', () => {
    t.throws(() => {
        t.throws();
    },
    err => {
        t.equal(err.message, 'argument 1 \'fn\' should be a function');
    });

    t.throws(() => {
        t.throws((a,b,c) => {});
    },
    err => {
        t.equal(err.message, 'argument 1 \'fn\' should be a function with 0 or 1 argument');
    });

    t.throws(() => {
        t.throws(() => {}, 1);
    },
    err => {
        t.equal(err.message, 'argument 2 should be a function or string');
    });
    
    t.throws(() => {
        t.throws(()=>{}, ()=>{}, 1);
    },
    err => {
        t.equal(err.message, 'argument 3 \'message\' should be a string');
    });
});

suite.test('validation count()', () => {
    t.throws(() => {
        t.count(1);
    },
    err => {
        t.equal(err.message, 'argument 1 \'fn\' should be a function');
    });
    
    t.throws(() => {
        t.count((a) => {
        }, 0);
    },
    err => {
        t.equal(err.message, 'argument 2 \'count\' should be a number greater than 0');
    });
});