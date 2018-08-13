'use strict';
const Suite = require('../lib/Suite');
const t = require('../lib/assert');
const promise = require('../lib/promise');

const suite = new Suite('fail fast');
suite.config({timeout: -1});

suite.test('concurrent', done => {
    const CopyOfSuite = Suite.getNewLibraryCopy();

    function SpyReporter(runner) {
        runner.on('suiteEnd', suite2 => {
            try {
                t.equals(suite2.tests[0].status, 'pass');
                t.equals(suite2.tests[1].status, 'fail');
                t.equals(suite2.tests[2].status, 'stop');
            } catch(err) {
                done(err);
                return;
            }

            done();
        });
    }
    CopyOfSuite.addReporter(SpyReporter);

    const innerSuite = new CopyOfSuite('fail fast');
// const innerSuite = suite;
    innerSuite.config({failFast: true, timeout: -1});

    innerSuite.test('pass', () => {
        t.equal(1, 1);
    });

    innerSuite.test('fail', async () => {
        await promise.delay(500);
        t.fail();
    });

    innerSuite.test('stop', () => {
        return promise.delay(50000)
            .then(() => {
                t.equal(1, 1);
            });
    });
});

suite.test('serial', done => {
    const CopyOfSuite = Suite.getNewLibraryCopy(false);

    function SpyReporter(runner) {
        runner.on('suiteEnd', suite2 => {
            try {
                t.equals(suite2.tests[0].status, 'pass');
                t.equals(suite2.tests[1].status, 'fail');
                t.equals(suite2.tests[2].status, 'stop');
            } catch(err) {
                done(err);
                return;
            }

            done();
        });
    }
    CopyOfSuite.addReporter(SpyReporter);

    const innerSuite = new CopyOfSuite('fail fast');
    innerSuite.config({failFast: true, timeout: -1});

    innerSuite.serial.test('pass', () => {
        t.equal(1, 1);
    });

    innerSuite.serial.test('fail', () => {
        t.fail();
    });

    innerSuite.serial.test('stop', () => {
        return promise.delay(100)
            .then(() => {
                t.equal(1, 1);
            });
    });
});
