'use strict';
// require('./traces').showFullStackTrace();
// require('./traces');
const Context = require('./Context');
// const traces = require('./traces');
// traces.showFullStackTrace();
const Runner = require('./Runner');
const Test = require('./Test');
const Hook = require('./Hook');
const shared = require('./shared');

const report = shared.report;
const ran = Symbol('ran');
const hasOnly = Symbol('hasOnly');
const tests = Symbol('tests');
const before = Symbol('before');
const after = Symbol('after');
const beforeEach = shared.beforeEach;
const afterEach = shared.afterEach;
const opts = shared.opts;
const runner = shared.runner;
const addTest = Symbol('addTest');
const run = shared.run;

async function runTests(_tests, serial, options) {
    let pass = true;

    if (_tests.length === 0)
        return pass;

    if (serial) {
        let cancelled = false;

        for (let i = 0; i < _tests.length; i++) {
            const test = _tests[i];

            if (cancelled)
                continue;

            try {
                await test.run();
            } catch (err) {
                pass = false;
                if (options.failFast)
                    cancelled = true;
            }
        }

    } else {

        const promises = [];
        const thenHandler = testPass => {
            if (!testPass) {
                pass = false;
                // if (options.failFast) {
                //     for (const promise of promises) {
                //         if (promise.isPending())
                //             promise.cancel();
                //     }
                // }
            }
        };

        for (let i = 0; i < _tests.length; i++) {
            const test = _tests[i];
            const p = test.run()
                .then(thenHandler);
            promises.push(p);
        }

        await Promise.all(promises);
    }

    return pass;
}

function makeInstance() {
    const _runner = new Runner();

    class Suite {
        constructor(suiteName) {
            if (typeof suiteName !== 'string')
                throw new Error('argument 1 \'name\' should be a string');
            this[report] = {
                name: suiteName
            };
            this[ran] = false;
            this[hasOnly] = false;
            this[tests] = [];
            this[before] = undefined;
            this[after] = undefined;
            this[beforeEach] = undefined;
            this[afterEach] = undefined;
            this[opts] = {
                failFast: false,
                timeout: 5000
            };
            this[runner] = _runner;

            this.test = (testName, action, failHandler) => this[addTest](testName, action, failHandler, {}, this.test);
            this.only = (testName, action, failHandler) => this[addTest](testName, action, failHandler, {only: true}, this.only);
            this.skip = (testName, action) => this[addTest](testName, action, undefined, {skip: true}, this.skip);
            this.todo = (testName, action) => this[addTest](testName, action, undefined, {todo: true}, this.todo);

            this.serial = {
                test: (testName, action, failHandler) => this[addTest](testName, action, failHandler, {serial: true}, this.serial.test),
                only: (testName, action, failHandler) => this[addTest](testName, action, failHandler, {
                    serial: true,
                    only: true
                }, this.serial.only),
                skip: (testName, action) => this[addTest](testName, action, undefined, {
                    serial: true,
                    skip: true
                }, this.serial.skip),
                todo: (testName, action) => this[addTest](testName, action, undefined, {
                    serial: true,
                    todo: true
                }, this.serial.todo)
            };

            this[runner].addSuite(this);
        }

        static addReporter(Reporter) {
            _runner.addReporter(Reporter);
        }

        static getNewLibraryCopy() {
            return makeInstance();
        }

        config(options) {
            if (typeof options !== 'object' || options === null)
                shared.throwError('argument 1 \'options\' should be a object', Suite.prototype.config);
            if (typeof options.failFast !== 'boolean' && typeof options.failFast !== 'undefined')
                shared.throwError('option \'failFast\' should be a boolean', Suite.prototype.config);
            if (options.timeout && typeof options.timeout !== 'number')
                shared.throwError('option \'timeout\' should be a number', Suite.prototype.config);

            this[opts].failFast = Boolean(options.failFast);
            this[opts].timeout = options.timeout || this[opts].timeout;
        }

        [addTest](name, action, failHandler, options, stackStartFunction) {
            if (options.only)
                this[hasOnly] = true;

            if (typeof name !== 'string')
                shared.throwError('argument 1 \'name\' should be a string', stackStartFunction);
            if (!options.skip && !options.todo && typeof action !== 'function')
                shared.throwError('argument 2 \'action\' should be a function', stackStartFunction);
            if (failHandler !== undefined && typeof failHandler !== 'function')
                shared.throwError('argument 3 \'failHandler\' should be a function', stackStartFunction);
            if (this[ran])
                shared.throwError('can\'t add test after suite starts running', stackStartFunction);

            this[tests].push(new Test(this, name, action, failHandler, options));

            return this;
        }

        before(action) {
            if (this[ran])
                shared.throwError('can\'t add hook after suite starts running', Suite.prototype.before);
            if (this[before])
                shared.throwError('before hook is already defined', Suite.prototype.before);
            this[before] = new Hook(this, action, true);
            return this;
        }

        after(action) {
            if (this[ran])
                shared.throwError('can\'t add hook after suite starts running', Suite.prototype.after);
            if (this[after])
                shared.throwError('after hook is already defined', Suite.prototype.after);
            this[after] = new Hook(this, action, true);
            return this;
        }

        beforeEach(action) {
            if (this[ran])
                shared.throwError('can\'t add hook after suite starts running', Suite.prototype.beforeEach);
            if (this[beforeEach])
                shared.throwError('beforeEach hook is already defined', Suite.prototype.beforeEach);
            this[beforeEach] = new Hook(this, action, false);
            return this;
        }

        afterEach(action) {
            if (this[ran])
                shared.throwError('can\'t add hook after suite starts running', Suite.prototype.afterEach);
            if (this[afterEach])
                shared.throwError('afterEach hook is already defined', Suite.prototype.afterEach);
            this[afterEach] = new Hook(this, action, false);
            return this;
        }

        async [run]() {
            this[ran] = true;

            const serialTests = [], asyncTests = [], allTests = [];

            for (const test of this[tests]) {
                if (this[hasOnly] && !test.options.only)
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

            this[report].tests = allTests;

            try {
                if (this[before])
                    await this[before].run();
            } catch (err) {
                err.message = `before hook failed: ${err.message}`;
                throw err;
            }

            let pass;
            try {
                pass = await runTests(serialTests, true, this[opts]);
                pass = (await runTests(asyncTests, false, this[opts])) && pass;
            } catch (err) {
                this[report].err = err;
            }

            if (pass) {
                try {
                    if (this[after])
                        await this[after].run();
                } catch (err) {
                    err.message = `after hook failed: ${err.message}`;
                    throw err;
                }
            }

            this[runner].emitSuiteEnd(this);

            return pass;
        }
    }

    return Suite;
}

module.exports = makeInstance();
