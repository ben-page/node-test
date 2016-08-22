'use strict';
const Promise = require('bluebird');
const Test = require('./test');
const Assert = require('./assert');
const util = require('./util');
const internal = require('./internal');

const opts = internal.opts;

function Hook(suite, action) {
    this.suite = suite;
    this.action = action;
    this.promise = Promise.resolve();
}

Hook.prototype.run = function() {
    const t = new Assert(this);
    
    return Promise
        .try(() => {
            return Promise.resolve(util.runAsyncPromise(this.action, t)
                    .then(() => this.promise))
                .timeout(this.suite[opts].timeout);
        });
};

Hook.prototype.addPromise = Test.prototype.addPromise;

module.exports = Hook;
