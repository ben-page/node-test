'use strict';
const domain = require('domain');
const promise = require('./promise');
const Test = require('./test');
const Assert = require('./assert');
const internal = require('./internal');

const opts = internal.opts;
const runner = internal.runner;
const report = internal.report;

function Hook(suite, action, standalone, stack) {
    this.suite = suite;
    this.report = {
        suite: suite[report]
    };
    this.action = action;
    this.promises = [];
    this.standalone = standalone;
    this.stack = stack;
}

Hook.prototype.run = function (...args) {
    // if (domain) {
    //     const d = domain.create();
    //     let lastErr;
    //
    //     d.on('error', err => {
    //         if (lastErr === err)
    //             return;
    //         lastErr = err;
    //         console.error(`Uncaught Exception in hook for suite '${this.report.suite.name}'`);
    //         util.concatStackTraces(err, this.stack);
    //         console.error(err.stack);
    //         this.suite[runner].emitError(err);
    //         //eslint-disable-next-line no-process-exit
    //         process.exit(1);
    //     });
    //
    //     return d.run(() => {
    //         return this.run2(...args);
    //     });
    // }
    
    return this.run2(...args);
};

Hook.prototype.run2 = async function (...args) {
    if (this.standalone) {
        const t = new Assert(this);
        args.unshift(t);
    }
    const p = Test.runAsync(this.stack, this.action, ...args);

    const args2 = await promise.timeout(() => {
        return Promise.all([p, this.runPromises()]);
    }, this.suite[opts].timeout);

    return args2[0];
};

module.exports = Hook;
