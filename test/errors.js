'use strict';
const Promise = require('bluebird');
Promise.config({
    warnings: true,
    longStackTraces: true
});
const Suite = require('../lib/suite');

const suite = new Suite('errors');

suite.test('error message', t => {
    t.throws(() => {
        t.equal(1, 2, 'not equal!');
    },
    err => {
        t.equal(err.message, 'not equal!');
        const lines = err.stack.split('\n');
        t.true(lines[1].indexOf(__filename) > -1);
    });
});

suite.test('no error message', t => {
    t.throws(() => {
        t.equal(1, 2);
    },
    err => {
        const lines = err.stack.split('\n');
        t.true(lines[1].indexOf(__filename) > -1);
    });
});

suite.test('validation fail()', t => {
    t.throws(() => {
        t.fail(1);
    },
    err => {
        t.equal(err.message, 'argument 1 \'message\' should be a string');
    });
});

suite.test('validation true()', t => {
    t.throws(() => {
        t.true(1);
    },
    err => {
        t.equal(err.message, 'argument 1 \'value\' should be a boolean');
    });
});

suite.test('validation true()', t => {
    t.throws(() => {
        t.true(true, 1);
    },
    err => {
        t.equal(err.message, 'argument 2 \'message\' should be a string');
    });
});

suite.test('validation false()', t => {
    t.throws(() => {
        t.false(1);
    },
    err => {
        t.equal(err.message, 'argument 1 \'value\' should be a boolean');
    });
});

suite.test('validation false()', t => {
    t.throws(() => {
        t.false(true, 1);
    },
    err => {
        t.equal(err.message, 'argument 2 \'message\' should be a string');
    });
});

suite.test('validation truthy()', t => {
    t.throws(() => {
        t.truthy(true, 1);
    },
    err => {
        t.equal(err.message, 'argument 2 \'message\' should be a string');
    });
});

suite.test('validation assert()', t => {
    t.throws(() => {
        t.assert(true, 1);
    },
    err => {
        t.equal(err.message, 'argument 2 \'message\' should be a string');
    });
});

suite.test('validation falsey()', t => {
    t.throws(() => {
        t.falsey(true, 1);
    },
    err => {
        t.equal(err.message, 'argument 2 \'message\' should be a string');
    });
});

suite.test('validation equal()', t => {
    t.throws(() => {
        t.equal(true, false, 1);
    },
    err => {
        t.equal(err.message, 'argument 3 \'message\' should be a string');
    });
});

suite.test('validation equals()', t => {
    t.throws(() => {
        t.equals(true, false, 1);
    },
    err => {
        t.equal(err.message, 'argument 3 \'message\' should be a string');
    });
});

suite.test('validation is()', t => {
    t.throws(() => {
        t.is(true, false, 1);
    },
    err => {
        t.equal(err.message, 'argument 3 \'message\' should be a string');
    });
});

suite.test('validation notEqual()', t => {
    t.throws(() => {
        t.notEqual(true, false, 1);
    },
    err => {
        t.equal(err.message, 'argument 3 \'message\' should be a string');
    });
});

suite.test('validation not()', t => {
    t.throws(() => {
        t.not(true, false, 1);
    },
    err => {
        t.equal(err.message, 'argument 3 \'message\' should be a string');
    });
});

suite.test('validation notEquals()', t => {
    t.throws(() => {
        t.notEquals(true, false, 1);
    },
    err => {
        t.equal(err.message, 'argument 3 \'message\' should be a string');
    });
});

suite.test('validation deepEqual()', t => {
    t.throws(() => {
        t.deepEqual(true, false, 1);
    },
    err => {
        t.equal(err.message, 'argument 3 \'message\' should be a string');
    });
});

suite.test('validation notDeepEqual()', t => {
    t.throws(() => {
        t.notDeepEqual(true, false, 1);
    },
    err => {
        t.equal(err.message, 'argument 3 \'message\' should be a string');
    });
});

suite.test('validation greaterThan()', t => {
    t.throws(() => {
        t.greaterThan(true, false, 1);
    },
    err => {
        t.equal(err.message, 'argument 3 \'message\' should be a string');
    });
});

suite.test('validation greaterThanOrEqual()', t => {
    t.throws(() => {
        t.greaterThanOrEqual(true, false, 1);
    },
    err => {
        t.equal(err.message, 'argument 3 \'message\' should be a string');
    });
});

suite.test('validation lessThan()', t => {
    t.throws(() => {
        t.lessThan(true, false, 1);
    },
    err => {
        t.equal(err.message, 'argument 3 \'message\' should be a string');
    });
});

suite.test('validation lessThanOrEqual()', t => {
    t.throws(() => {
        t.lessThanOrEqual(true, false, 1);
    },
    err => {
        t.equal(err.message, 'argument 3 \'message\' should be a string');
    });
});

suite.test('validation noError()', t => {
    t.throws(() => {
        t.noError(true, 1);
    },
    err => {
        t.equal(err.message, 'argument 2 \'message\' should be a string');
    });
});

suite.test('validation throws()', t => {
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
        t.throws(()=>{}, 1);
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

suite.test('validation notThrows()', t => {
    t.throws(() => {
        t.notThrows();
    },
    err => {
        t.equal(err.message, 'argument 1 \'fn\' should be a function');
    });
    
    t.throws(() => {
        t.notThrows((a,b,c) => {});
    },
    err => {
        t.equal(err.message, 'argument 1 \'fn\' should be a function with 0 or 1 argument');
    });
    
    t.throws(() => {
        t.notThrows(() => {}, 1);
    },
    err => {
        t.equal(err.message, 'argument 2 \'message\' should be a string');
    });
});

suite.test('validation async()', t => {
    t.throws(() => {
        t.async(1, 2, 3);
    },
    err => {
        t.equal(err.message, 'expected between 0 and 2 arguments');
    });
    
    t.throws(() => {
        t.async('test');
    },
    err => {
        t.equal(err.message, 'argument 1 should be a function or number');
    });
    
    t.throws(() => {
        t.async((a) => {
        }, 0);
    },
    err => {
        t.equal(err.message, 'argument 2 \'count\' should be a whole number greater than 0');
    });
    
    t.throws(() => {
        t.async(1, 1);
    },
    err => {
        t.equal(err.message, 'unexpected argument 2');
    });
    
    t.throws(() => {
        t.async((a) => {
        }, 5.5);
    },
    err => {
        t.equal(err.message, 'argument 2 \'count\' should be a whole number greater than 0');
    });
});