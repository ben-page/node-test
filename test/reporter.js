'use strict';
const Suite = require('../lib/Suite');
const Reporter = require('../lib/reporter');
Suite.addReporter(Reporter);
Suite.addReporter(SpyReporter);

let start = 0,
    end = 0,
    testEnd = 0,
    expectedTests = 0,
    suiteEnd = 0,
    expectedSuites = 0;

const tests = [];

function SpyReporter(runner) {
    runner.on('start', roo() => {
        if (++start !== 1)
            throw new Error(`expected start event 1 times, but got it ${start} times`);
    
        expectedSuites = root.suites.length;
    });
    
    runner.on('testEnd', tes() => {
        testEnd++;
        if (tests.indexOf(test) > -1)
            throw new Error(`testEnd called twice for test ${test.name}`);
        tests.push(test);
    });
    
    runner.on('suiteEnd', suite => {
        suiteEnd++;
        expectedTests += suite.tests.length;
    });
    
    runner.on('end', () => {
        if (++end > 1)
            throw new Error(`expected end event 1 times, but got it ${end} times`);
    
        if (suiteEnd !== expectedSuites)
            throw new Error(`expected suiteEnd event ${expectedSuites} times, but got it ${suiteEnd} times`);
    
        if (testEnd !== expectedTests)
            throw new Error(`expected testEnd event ${expectedTests} times, but got it ${testEnd} times`);
    });
}