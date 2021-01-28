'use strict';
const Context = require('./Context.js');
const shared = require('./shared.js');
const $report = shared.report;

module.exports = class Hook {
    constructor(suite, action) {
        this.suite = suite;
        this.report = {
            suite: suite[$report]
        };
        this.action = action;
        this.promises = [];
        this.context = new Context('node-test.Hook');
    }

    async run(input) {
        let output;
        try {
            output = await this.context.run(async () => {
                return await shared.runFn(this.suite[shared.opts].timeout, this.action, input);
            });
        } catch (err) {
            this.report.err = err;
        }

        //just throw uncaught error to suite
        if (this.report.err)
            throw this.report.err;

        return output;
    }

    end() {
        this.context.destroy();
    }
};
