'use strict';
const Promise = require('bluebird');
const EventEmitter = require('events');
const timers = require('timers');
const DefaultReporter = require('./reporter');

function Runner() {
    EventEmitter.call(this);

    this._reporterSet = false;
    this._suites = [];

    timers.setImmediate(() => {
        this._run();
    });
}

Runner.prototype = Object.create(EventEmitter.prototype);
Runner.constructor = Runner;

Runner.prototype._addSuite = function(suite) {
    this._suites.push(suite);
};

Runner.prototype._addReporter = function(Reporter) {
    this._reporterSet = true;
    return new Reporter(this);
};

Runner.prototype._run = function() {
    this._ran = true;
    if (!this._reporterSet)
        new DefaultReporter(this);

    this._emitStart();

    return Promise.map(this._suites, suite => {
        return suite._run();
    })
    .then(() => {
        this._emitEnd();
    })
    .catch(err => {
        console.error(err.stack);
        process.exit(1);
    });
};

Runner.prototype._emitStart = function() {
    const reports = [];

    for (const suite of this._suites)
        reports.push(suite._report);

    this.emit('start', {
        suites: reports
    });
};

Runner.prototype._emitSuiteEnd = function(suite) {
    this.emit('suiteEnd', suite._report);
};

Runner.prototype._emitTestEnd = function(test) {
    this.emit('testEnd', test._report);
};

Runner.prototype._emitEnd = function() {
    this.emit('end');
};

const runner = new Runner();
module.exports = runner;
