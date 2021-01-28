'use strict';
require('./Context.js');
const Runner = require('./Runner.js');
const Test = require('./Test.js');
const Hook = require('./Hook.js');
const shared = require('./shared.js');
const promise = require('./promise.js');

const $report = shared.report;
const $beforeEach = shared.beforeEach;
const $afterEach = shared.afterEach;
const $opts = shared.opts;
const $runner = shared.runner;
const $run = shared.run;

const $addTest = Symbol('$addTest');
const $ran = Symbol('$ran');
const $hasOnly = Symbol('$hasOnly');
const $tests = Symbol('$tests');
const $before = Symbol('$before');
const $after = Symbol('$after');
const $runTestAndHooks = Symbol('$runTestAndHooks');
const $runTests = Symbol('$runTests');

function makeInstance(exitProcess) {
    const _runner = new Runner(exitProcess);

    class Suite {
        constructor(suiteName) {
            if (typeof suiteName !== 'string')
                throw new Error('argument 1 \'name\' should be a string');
            this[$report] = {
                name: suiteName
            };
            this[$ran] = false;
            this[$hasOnly] = false;
            this[$tests] = [];
            this[$before] = undefined;
            this[$after] = undefined;
            this[$beforeEach] = undefined;
            this[$afterEach] = undefined;
            this[$opts] = {
                failFast: false,
                timeout: 5000
            };
            this[$runner] = _runner;

            this.test = (testName, action, failHandler) => this[$addTest](testName, action, failHandler, {}, this.test);
            this.only = (testName, action, failHandler) => this[$addTest](testName, action, failHandler, {only: true}, this.only);
            this.skip = (testName, action) => this[$addTest](testName, action, undefined, {skip: true}, this.skip);
            this.todo = (testName, action) => this[$addTest](testName, action, undefined, {todo: true}, this.todo);

            this.serial = {
                test: (testName, action, failHandler) => this[$addTest](testName, action, failHandler, {serial: true}, this.serial.test),
                only: (testName, action, failHandler) => this[$addTest](testName, action, failHandler, {
                    serial: true,
                    only: true
                }, this.serial.only),
                skip: (testName, action) => this[$addTest](testName, action, undefined, {
                    serial: true,
                    skip: true
                }, this.serial.skip),
                todo: (testName, action) => this[$addTest](testName, action, undefined, {
                    serial: true,
                    todo: true
                }, this.serial.todo)
            };

            this[$runner].addSuite(this);
        }

        static addReporter(Reporter) {
            _runner.addReporter(Reporter);
        }

        static getNewLibraryCopy(exitProcess2) {
            return makeInstance(exitProcess2);
        }

        config(options) {
            if (typeof options !== 'object' || options === null)
                shared.throwError('argument 1 \'options\' should be a object', Suite.prototype.config);
            if (typeof options.failFast !== 'boolean' && typeof options.failFast !== 'undefined')
                shared.throwError('option \'failFast\' should be a boolean', Suite.prototype.config);
            if (options.timeout && typeof options.timeout !== 'number')
                shared.throwError('option \'timeout\' should be a number', Suite.prototype.config);

            this[$opts].failFast = Boolean(options.failFast);
            this[$opts].timeout = options.timeout || this[$opts].timeout;
        }

        [$addTest](name, action, failHandler, options, stackStartFunction) {
            if (options.only)
                this[$hasOnly] = true;

            if (typeof name !== 'string')
                shared.throwError('argument 1 \'name\' should be a string', stackStartFunction);
            if (!options.skip && !options.todo && typeof action !== 'function')
                shared.throwError('argument 2 \'action\' should be a function', stackStartFunction);
            if (failHandler !== undefined && typeof failHandler !== 'function')
                shared.throwError('argument 3 \'failHandler\' should be a function', stackStartFunction);
            if (this[$ran])
                shared.throwError('can\'t add test after suite starts running', stackStartFunction);

            this[$tests].push(new Test(this, name, action, failHandler, options));

            return this;
        }

        before(action) {
            if (this[$ran])
                shared.throwError('can\'t add hook after suite starts running', Suite.prototype.before);
            if (this[$before])
                shared.throwError('before hook is already defined', Suite.prototype.before);
            this[$before] = new Hook(this, action, true);
            return this;
        }

        after(action) {
            if (this[$ran])
                shared.throwError('can\'t add hook after suite starts running', Suite.prototype.after);
            if (this[$after])
                shared.throwError('after hook is already defined', Suite.prototype.after);
            this[$after] = new Hook(this, action, true);
            return this;
        }

        beforeEach(action) {
            if (this[$ran])
                shared.throwError('can\'t add hook after suite starts running', Suite.prototype.beforeEach);
            if (this[$beforeEach])
                shared.throwError('beforeEach hook is already defined', Suite.prototype.beforeEach);
            this[$beforeEach] = new Hook(this, action, false);
            return this;
        }

        afterEach(action) {
            if (this[$ran])
                shared.throwError('can\'t add hook after suite starts running', Suite.prototype.afterEach);
            if (this[$afterEach])
                shared.throwError('afterEach hook is already defined', Suite.prototype.afterEach);
            this[$afterEach] = new Hook(this, action, false);
            return this;
        }

        async [$runTests](tests, serial) {
            let pass = true;

            if (tests.length === 0)
                return pass;

            if (serial) {
                let cancelled = false;

                for (let i = 0; i < tests.length; i++) {
                    const test = tests[i];

                    if (cancelled)
                        continue;

                    pass = pass && await test.run();
                    if (!pass && this[$opts].failFast)
                        cancelled = true;
                }

            } else {
                const promises = [];
                let running;

                for (let i = 0; i < tests.length; i++) {
                    const test = tests[i];
                    const p = promise.cancelable(test.run()
                        .then(testPass => {
                            running.delete(p);
                            if (!testPass) {
                                pass = false;
                                if (this[$opts].failFast) {
                                    for (const p2 of running)
                                        p2.cancel();
                                }
                            }
                        }));

                    p
                        .catch(err => {
                            if (err instanceof promise.PromiseCancellationError) {
                                test.report.runTime = -1;
                                test.end();
                            }
                        });
                    promises.push(p);
                }

                running = new Set(promises);

                await Promise.all(promises);
            }

            return pass;
        }

        async [$runTestAndHooks]() {
            const serialTests = [], asyncTests = [], allTests = [];

            for (const test of this[$tests]) {
                if (this[$hasOnly] && !test.options.only)
                    continue;

                allTests.push(test.report);

                if (test.options.skip || test.options.todo) {
                    test.end();
                    continue;
                }

                if (test.options.serial)
                    serialTests.push(test);
                else
                    asyncTests.push(test);
            }

            this[$report].tests = allTests;

            try {
                if (this[$before])
                    await this[$before].run();
            } catch (err) {
                shared.updateErrorMessage(err, `[before hook failed] ${err.message}`);
                throw err;
            }

            let pass;
            try {
                pass = await this[$runTests](serialTests, true);
                pass = (await this[$runTests](asyncTests, false)) && pass;
            } catch (err) {
                shared.updateErrorMessage(err, `[internal suite failed] ${err.message}`);
                throw err;
            }

            if (pass) {
                try {
                    if (this[$after])
                        await this[$after].run();
                } catch (err) {
                    shared.updateErrorMessage(err, `[after hook failed] ${err.message}`);
                    throw err;
                }
            }

            return pass;
        }

        async [$run]() {
            this[$ran] = true;

            let pass = false;
            try {
                pass = await this[$runTestAndHooks](this[$tests], this[$hasOnly]);
            } catch (err) {
                this[$report].err = err;
            }

            if (!pass || this[$report].err) {
                for (const test of this[$tests])
                    test.end();
            }

            if (this[$before])
                this[$before].end();
            if (this[$after])
                this[$after].end();
            if (this[$beforeEach])
                this[$beforeEach].end();
            if (this[$afterEach])
                this[$afterEach].end();

            this[$runner].emitSuiteEnd(this);

            return pass;
        }
    }

    return Suite;
}

module.exports = makeInstance(true);
