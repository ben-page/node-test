'use strict';
const Promise = require('bluebird');
Promise.config({
    warnings: true,
    longStackTraces: true
});
const Suite = require('../lib/suite');

const suite = new Suite('fail fast');

suite.test('concurrent', (t, state, done) => {
    const CopyOfSuite = Suite.getNewLibraryCopy();
    
    function SpyReporter(runner) {
        runner.on('suiteEnd', suite2 => {
            t.equals(suite2.tests[0].status, 'pass');
            t.equals(suite2.tests[1].status, 'fail');
            t.equals(suite2.tests[2].status, 'stop');
            done();
        });
    }
    CopyOfSuite.addReporter(SpyReporter);
    
    const innerSuite = new CopyOfSuite('fail fast');
    innerSuite.config({failFast: true});
    
    innerSuite.test('pass', t2 => {
        t2.equal(1, 1);
    });
    
    innerSuite.test('fail', t2 => {
        t2.fail();
    });
    
    innerSuite.test('stop', t2 => {
        return Promise.delay(30000)
            .then(() => {
                t2.equal(1, 1);
            });
    });
});

suite.test('serial', (t, state, done) => {
    const CopyOfSuite = Suite.getNewLibraryCopy();

    function SpyReporter(runner) {
        runner.on('suiteEnd', suite2 => {
            t.equals(suite2.tests[0].status, 'pass');
            t.equals(suite2.tests[1].status, 'fail');
            t.equals(suite2.tests[2].status, 'stop');
            done();
        });
    }
    CopyOfSuite.addReporter(SpyReporter);

    const innerSuite = new CopyOfSuite('fail fast');
    innerSuite.config({failFast: true});

    innerSuite.serial.test('pass', t2 => {
        t2.equal(1, 1);
    });

    innerSuite.serial.test('fail', t2 => {
        t2.fail();
    });

    innerSuite.serial.test('stop', t2 => {
        return Promise.delay(100)
            .then(() => {
                t2.equal(1, 1);
            });
    });
});
