'use strict';
const chalk = require('chalk');

function Reporter(emitter) {
    emitter.on('suiteEnd', suite => {
        console.log(chalk.inverse(`    ${suite.name}    `));
        
        const failures = [];
        let total = 0;

        for (let i = 0; i < suite.tests.length; i++) {
            const index = i + 1;
            const test = suite.tests[i];

            if (test.status === 'skip') {
                console.log(`skip ${index} - ${test.name}`);
                continue;
            }

            if (test.status === 'todo') {
                console.log(`todo ${index} - ${test.name}`);
                continue;
            }

            total++;

            if (test.status === 'pass') {
                console.log(`${chalk.green('pass')} ${index} - ${test.name} ${chalk.blue(`(${test.runTime}ms)`)}`);
            } else if (test.status === 'stop') {
                console.log(`${chalk.yellow('stop')} ${index} - ${test.name}`);
            } else if (test.status === 'fail') {
                failures.push(index);

                console.log(`${chalk.red('fail')} ${index} - ${test.name} ${chalk.blue(`(${test.runTime}ms)`)}`);
                const err = test.err;
                if (err.stack)
                    console.log(chalk.red(err.stack));
                else if (err)
                    console.log(chalk.red(err));
            } else {
                throw new Error('[internal error] invalid test report');
            }
        }

        console.log();

        if (suite.err) {
            console.log(chalk.red(suite.err.stack));
            console.log();
        }

        console.log(`${chalk.bold('Total:')} ${total}`);
        const passed = total - failures.length;
        if (failures.length > 0) {
            console.log(`${chalk.bold('Failed:')} ${failures.length} (${failures.join(', ')})`);
            process.exitCode = 1;
        }
        const percent = total === 0 ? 0 : Math.round(passed / total * 100);
        console.log(`${chalk.bold('Passed:')} ${passed} ${percent}%`);

        console.log();
    });

}
module.exports = Reporter;
