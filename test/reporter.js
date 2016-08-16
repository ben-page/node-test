'use strict';
const Promise = require('bluebird');
Promise.config({
    warnings: true,
    longStackTraces: true
});
const Suite = require('../lib/suite');
const Reporter = require('../lib/reporter');
Suite.addReporter(Reporter);
Suite.addReporter(SpyReporter);

let start = 0,
    testEnd = 0,
    suiteEnd = 0,
    end = 0,
    expectedTestEnd = 0;

const expectedSuiteEnd = 10;

const tests = [];

function SpyReporter(runner) {
    runner.on('start', root => {
        start++;
    });
    
    runner.on('testEnd', test => {
        testEnd++;
        if (tests.indexOf(test) > -1)
            throw new Error(`testEnd called twice for test ${test.name}`);
        tests.push(test);
    });
    
    runner.on('suiteEnd', suite => {
        suiteEnd++;
        expectedTestEnd += suite.tests.length;
    });
    
    runner.on('end', () => {
        if (++end > 1)
            throw new Error(`expected end event 1 times, but got it ${end} times`);
    
        if (start !== 1)
            throw new Error(`expected start event 1 times, but got it ${start} times`);
    
        if (suiteEnd !== expectedSuiteEnd)
            throw new Error(`expected suiteEnd event ${expectedSuiteEnd} times, but got it ${suiteEnd} times`);
    
        if (testEnd !== expectedTestEnd)
            throw new Error(`expected testEnd event ${expectedTestEnd} times, but got it ${testEnd} times`);
    });
}