'use strict';
const Promise = require('bluebird');
const Test = require('./test');
const Assert = require('./assert');
const util = require('./util');

function Hook(suite, action) {
    this._suite = suite;
    this._action = action;
    this._promise = Promise.resolve();
}

Hook.prototype._run = function() {
    const t = new Assert(this);
    
    return Promise
        .try(() => {
            return Promise.resolve(util.runAsyncPromise(this._action, t)
                    .then(() => this._promise))
                .timeout(this._suite._timeoutDelay);
        });
};

Hook.prototype._addPromise = Test.prototype._addPromise;

module.exports = Hook;
