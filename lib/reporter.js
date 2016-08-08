'use strict';
const chalk = require('chalk');

function Reporter(runner) {
    runner.on('start', root => {
        // for (const suite of root.suites) {
        //     console.log(suite.name);
        // }
    });
    
    runner.on('testEnd', test => {
        //console.log('testEnd ' + test.name);
    });

    runner.on('suiteEnd', suite => {
        if (suite.err) {
            console.log(suite.err.stack);
            process.exitCode = 1;
            return;
        }
        
        const failures = [];
        const expected = []; //expected failures
        let total = 0;

        console.log(chalk.inverse(`    ${suite.name}    `));

        for (let i=0; i < suite.tests.length; i++) {
            const index = i + 1;
            const test = suite.tests[i];

            if (test.status === 'skip') {
                console.log(`skip ${index} - ${test.name}`);
                continue;
            }

            if (test === 'todo') {
                console.log(`todo ${index} - ${test.name}`);
                continue;
            }

            total++;

            if (test.status === 'pass') {
                console.log(`${chalk.green('pass')} ${index} - ${test.name}`);
            } else if (test.status === 'stop') {
                console.log(`${chalk.yellow('stop')} ${index} - ${test.name}`);
            } else if (test.status === 'fail') {
                failures.push(index);

                console.log(`${chalk.red('fail')} ${index} - ${test.name}`);
                const err = test.err;
                if (err.stack)
                    console.log(chalk.red(err.stack));
                else if (err)
                    console.log(chalk.red(err));
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
    });

    runner.on('end', () => {
        //console.log('start');
    });

}
module.exports = Reporter;
