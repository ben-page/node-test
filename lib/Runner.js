'use strict';
const EventEmitter = require('events');
const timers = require('timers');
const DefaultReporter = require('./Reporter.js');
const shared = require('./shared.js');

const $report = shared.report;
const $run = shared.run;

function Runner(exitProcess) {
    this.exitProcess = exitProcess;
    this.reporters = [];
    this.suites = [];
    this.emitter = new EventEmitter();
    
    timers.setImmediate(() => {
        this.run();
    });
}

Runner.prototype.addSuite = function (suite) {
    this.suites.push(suite);
};

Runner.prototype.addReporter = function (Reporter) {
    const reporter = new Reporter(this.emitter);
    this.reporters.push(reporter);
    return reporter;
};

Runner.prototype.run = async function () {
    if (this.reporters.length === 0)
        this.addReporter(DefaultReporter);

    this.emitStart();

    try {
        const promises = [];
        let pass = true;
        const thenHandler = suitePass => {
            pass = pass && suitePass;
        };

        for (let i = 0; i < this.suites.length; i++) {
            promises.push(this.suites[i][$run]()
                .then(thenHandler)
            );
        }

        await Promise.all(promises);

        this.emitEnd();

        if (this.exitProcess) {
            //eslint-disable-next-line no-process-exit
            process.exit(pass ? 0 : 1);
        }

    } catch (err) {
        if (err.message.substring(0, 1) !== '[internal error] ')
            shared.updateErrorMessage(err, `[internal error] ${err.message}`);

        console.error(err.stack);
        //eslint-disable-next-line no-process-exit
        process.exit(1);
    }
};

Runner.prototype.emitStart = function () {
    const reports = [];

    for (const suite of this.suites)
        reports.push(suite[$report]);

    this.emitter.emit('start', {
        suites: reports
    });
};

Runner.prototype.emitSuiteEnd = function (suite) {
    this.emitter.emit('suiteEnd', suite[$report]);
};

Runner.prototype.emitTestEnd = function (test) {
    this.emitter.emit('testEnd', test.report);
};

Runner.prototype.emitEnd = function () {
    this.emitter.emit('end');
};

Runner.prototype.emitError = function (err, test) {
    this.emitter.emit('error', err, test);
};

module.exports = Runner;
