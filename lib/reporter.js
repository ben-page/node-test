'use strict';
function reportSuite(suite) {
    const failures = [];
    const expected = []; //expected failures
    let total = 0;
    
    console.log(`----${suite.getName()}----`);
    
    for (let i=0; i < suite._tests.length; i++) {
        const index = i + 1;
        const test = suite._tests[i];
    
        if (test.hasOption('skip')) {
            if (!suite.hasOnly())
                console.log(`skip ${index} - ${test.getTitle()}`);
            continue;
        }
    
        if (test.hasOption('todo')) {
            if (!suite.hasOnly())
                console.log(`todo ${index} - ${test.getTitle()}`);
            continue;
        }
        if (suite.hasOnly() && !test.hasOption('only'))
            continue;
    
        const [passed, err] = test.getResolution();
        total++;
        
        if (passed) {
            console.log(`pass ${index} - ${test.getTitle()}`);
        } else {
            failures.push(index);
            if (test._options.failing) {
                expected.push(index);
                console.log(`fail ${index} - ${test.getTitle()} #failing test`);
            } else {
                if (err)
                    console.log(err.stack);
                console.log(`fail ${index} - ${test.getTitle()}`);
            }
        }
    }
    
    console.log();
    
    console.log(`Total: ${total}`);
    const passed = total - failures.length;
    if (failures.length > 0) {
        console.log(`Failed: ${failures.length} (${failures.join(', ')})`);
        if (failures.length > expected.length)
            process.exitCode = 1;
    }
    console.log(`Passed: ${passed} ${Math.round(passed / total * 100)}%`);
    
    console.log();
}

function reportFatal(message, err) {
    console.log(message);
    console.log(err.stack);
    process.exitCode = 1;
}

module.exports = {
    reportSuite,
    reportFatal
};