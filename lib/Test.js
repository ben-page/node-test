'use strict';
const shared = require('./shared');
const promise = require('./promise');
const Context = require('./Context');
const asyncHooks = require('async_hooks');
const fs = require('fs');

const report = shared.report;
const runner = shared.runner;

module.exports = class Test {
    constructor(suite, name, action, failHandler, options) {

        this.suite = suite;
        this.report = {
            name: name,
            suite: suite[report],
            status: undefined,
            runTime: -1
        };
        this.action = action;
        this.failHandler = failHandler;
        this.options = options || {};
        this.context = new Context('node-test.Test');
        this.context.on('error', err => {
            this._handleError(err);
        });
    }

    end() {
        if (this.options.skip)
            this.report.status = 'skip';
        else if (this.options.todo)
            this.report.status = 'todo';
        else if (this.report.err)
            this.report.status = 'fail';
        else if (this.report.runTime === -1)
            this.report.status = 'stop';
        else
            this.report.status = 'pass';

        this.suite[runner].emitTestEnd(this);
    }

    _handleError(err) {
        if (this.report.status)
            return false;

        if (this.failHandler) {
            try {
                this.failHandler(err);
            } catch (err2) {
                this.report.err = err2;
                return false;
            }

            return true;
        }

        this.report.err = err;
        return false;
    }

    async run(state) {
        try {
            await this.context.run(async () => {
                // fs.writeSync(1, `---throw - trigger: ${asyncHooks.triggerAsyncId()} execution: ${asyncHooks.executionAsyncId()}\n`);
                // throw new Error('test error');
                // setTimeout(() => {
                //     console.log(`timeout trigger: ${asyncHooks.triggerAsyncId()} execution: ${asyncHooks.executionAsyncId()}\n`);
                // }, 10);
                const start = process.hrtime();

                try {
                    await shared.runFn(this.suite[shared.opts].timeout, this.action);
                } finally {
                    this.report.runTime = Test.getElapsed(start);
                }
            });
        } catch (err) {
            return this._handleError(err);
        } finally {
            this.end();
        }

        return true;
    }

    static getElapsed(start) {
        const diff = process.hrtime(start);
        return Math.round(diff[0] * 1e3 + (diff[1] / 1e6));
    }
};
