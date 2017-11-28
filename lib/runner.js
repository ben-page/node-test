'use strict';
const EventEmitter = require('events');
const timers = require('timers');
const DefaultReporter = require('./reporter');
const internal = require('./internal');
const promise = require('./promise');

const report = internal.report;
const run = internal.run;

function Runner() {
    this.reporters = [];
    this.suites = [];
    this.emitter = new EventEmitter();
    
    timers.setImmediate(() => {
        this.run();
    });
}

Runner.prototype.addSuite = function(suite) {
    this.suites.push(suite);
};

Runner.prototype.addReporter = function(Reporter) {
    const reporter = new Reporter(this.emitter);
    this.reporters.push(reporter);
    return reporter;
};

Runner.prototype.run = async function() {
    this.ran = true;
    if (this.reporters.length === 0)
        this.addReporter(DefaultReporter);

    this.emitStart();

    try {
        await promise.map(this.suites, suite => {
            return suite[run]();
        });

        this.emitEnd();
    } catch (err) {
        console.error('unhandledException');
        console.error(err.stack);
        //eslint-disable-next-line no-process-exit
        process.exit(1);
    }
};

Runner.prototype.emitStart = function() {
    const reports = [];

    for (const suite of this.suites)
        reports.push(suite[report]);

    this.emitter.emit('start', {
        suites: reports
    });
};

Runner.prototype.emitSuiteEnd = function(suite) {
    this.emitter.emit('suiteEnd', suite[report]);
};

Runner.prototype.emitTestEnd = function(test) {
    this.emitter.emit('testEnd', test.report);
};

Runner.prototype.emitEnd = function () {
    this.emitter.emit('end');
};

Runner.prototype.emitError = function (err, test) {
    this.emitter.emit('error', err, test);
};

module.exports = Runner;
