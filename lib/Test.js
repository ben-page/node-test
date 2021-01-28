'use strict';
const shared = require('./shared.js');
const Context = require('./Context.js');

const $report = shared.report;
const $beforeEach = shared.beforeEach;
const $afterEach = shared.afterEach;
const $runner = shared.runner;

function calcElapsed(start) {
    const diff = process.hrtime(start);
    return Math.round(diff[0] * 1e3 + (diff[1] / 1e6));
}

module.exports = class Test {
    constructor(suite, name, action, failHandler, options) {
        this.suite = suite;
        this.report = {
            name,
            suite: suite[$report],
            status: undefined,
            runTime: -1
        };
        this.action = action;
        this.failHandler = failHandler;
        this.options = options || {};
        this.context = new Context('node-test.Test');
    }

    end() {
        if (this.report.status)
            return;

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

        this.suite[$runner].emitTestEnd(this);
        this.context.destroy();
    }

    async run() {
        let state, pass = true;
        if (this.suite[$beforeEach]) {
            try {
                state = await this.suite[$beforeEach].run();
            } catch (err) {
                shared.updateErrorMessage(err, `[before each hook failed] ${err.message}`);
                this.report.err = err;
                pass = false;
            }
        }

        if (pass) {
            try {
                await this.context.run(async () => {
                    const start = process.hrtime();
                    try {
                        if (this.suite[$beforeEach])
                            return await shared.runFn(this.suite[shared.opts].timeout, this.action, state);

                        return shared.runFn(this.suite[shared.opts].timeout, this.action);
                    // } catch (err) {
                    //     this.report.runTime = calcElapsed(start);
                    //     if (err instanceof promise.PromiseCancellationError)
                    //         this.report.runTime = -1;
                    //     throw err;
                    } finally {
                        this.report.runTime = calcElapsed(start);
                    }
                });
            } catch (err) {
                if (this.failHandler) {
                    try {
                        this.failHandler(err);
                    } catch (err2) {
                        this.report.err = err2;
                        pass = false;
                    }
                } else {
                    this.report.err = err;
                    pass = false;
                }
            }

            if (pass && this.suite[$afterEach]) {
                try {
                    if (this.suite[$beforeEach])
                        state = await this.suite[$afterEach].run(state);
                    else
                        state = await this.suite[$afterEach].run();
                } catch (err) {
                    shared.updateErrorMessage(err, `[after each hook failed] ${err.message}`);
                    this.report.err = err;
                    pass = false;
                }
            }
        }

        this.end();
        return pass;
    }
};
