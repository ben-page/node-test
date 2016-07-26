'use strict';
const chalk = require('chalk');

function reportSuite(suite) {
    const failures = [];
    const expected = []; //expected failures
    let total = 0;
    
    console.log(chalk.inverse(`    ${suite.getName()}    `));
    
    for (let i=0; i < suite._tests.length; i++) {
        const index = i + 1;
        const test = suite._tests[i];
        
        if (suite.hasOnly() && !test.hasOption('only'))
            continue;
        
        const resolution = test.getResolution();
            
        if (test.hasOption('skip')) {
            console.log(`skip ${index} - ${test.getTitle()}`);
            continue;
        }
    
        if (test.hasOption('todo')) {
            console.log(`todo ${index} - ${test.getTitle()}`);
            continue;
        }
        
        total++;
        
        if (resolution === 'pass') {
            console.log(`${chalk.green('pass')} ${index} - ${test.getTitle()}`);
        } else if (resolution === 'stop') {
            console.log(`${chalk.yellow('stop')} ${index} - ${test.getTitle()}`);
        } else if (resolution === 'fail') {
            failures.push(index);
            if (test.hasOption('failing')) {
                expected.push(index);
                console.log(`${chalk.red('fail')} ${index} - ${test.getTitle()} #failing test`);
            } else {
                console.log(`${chalk.red('fail')} ${index} - ${test.getTitle()}`);
                const err = test.getError();
                if (err.stack)
                    console.log(chalk.red(err.stack));
                else if (err)
                    console.log(chalk.red(err));
            }
        }
    }
    
    console.log();
    
    console.log(`${chalk.bold('Total:')} ${total}`);
    const passed = total - failures.length;
    if (failures.length > 0) {
        console.log(`${chalk.bold('Failed:')} ${failures.length} (${failures.join(', ')})`);
        if (failures.length > expected.length)
            process.exitCode = 1;
    }
    console.log(`${chalk.bold('Passed:')} ${passed} ${Math.round(passed / total * 100)}%`);
    
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