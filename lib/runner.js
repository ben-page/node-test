'use strict';
const Promise = require('bluebird');
const EventEmitter = require('events');
const timers = require('timers');
const DefaultReporter = require('./reporter');

function Runner() {
    this._reporterSet = false;
    this._suites = [];
    this._emitter = new EventEmitter();
    
    timers.setImmediate(() => {
        this._run();
    });
    
    // process.on('uncaughtException', err => {
    //     console.error('uncaughtException');
    //     console.error(err.stack);
    // });
}

Runner.prototype._addSuite = function(suite) {
    this._suites.push(suite);
};

Runner.prototype._addReporter = function(Reporter) {
    this._reporterSet = true;
    return new Reporter(this._emitter);
};

Runner.prototype._run = function() {
    this._ran = true;
    if (!this._reporterSet)
        new DefaultReporter(this._emitter);

    this._emitStart();

    return Promise.map(this._suites, suite => {
        return suite._run();
    })
    .then(() => {
        this._emitEnd();
    })
    .catch(err => {
        console.error('unhandledException');
        console.error(err.stack);
        process.exit(1);
    });
};

Runner.prototype._emitStart = function() {
    const reports = [];

    for (const suite of this._suites)
        reports.push(suite._report);

    this._emitter.emit('start', {
        suites: reports
    });
};

Runner.prototype._emitSuiteEnd = function(suite) {
    this._emitter.emit('suiteEnd', suite._report);
};

Runner.prototype._emitTestEnd = function(test) {
    this._emitter.emit('testEnd', test._report);
};

Runner.prototype._emitEnd = function () {
    this._emitter.emit('end');
};

Runner.prototype._emitError = function (err, test) {
    this._emitter.emit('error', err, test);
};

module.exports = Runner;
