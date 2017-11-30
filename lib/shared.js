'use strict';
module.exports = {
    report: Symbol('report'),
    beforeEach: Symbol('beforeEach'),
    afterEach: Symbol('afterEach'),
    opts: Symbol('options'),
    run: Symbol('run'),
    runner: Symbol('runner'),
    throwError(message, constructorOpt) {
        const err = new Error(message);
        Error.captureStackTrace(err, constructorOpt)
        throw err;
    }
};