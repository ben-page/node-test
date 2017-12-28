'use strict';
const Context = require('./Context');
const shared = require('./shared');
const report = shared.report;

module.exports = class Hook {
    constructor(suite, action, standalone) {
        this.suite = suite;
        this.report = {
            suite: suite[report]
        };
        this.action = action;
        this.promises = [];
        this.standalone = standalone;
        this.context = new Context('node-test.Test');
        this.context.on('error', err => {
            this.report.err = err;
        });
    }

    async run(state) {
        try {
            await this.context.run(async () => {
                await shared.runFn(this.suite[shared.opts].timeout, this.action, state);
            });
        } catch (err) {
            this.report.err = err;
        }

        //just through uncaught error to suite
        if (this.report.err)
            throw this.report.err;
    }
};
