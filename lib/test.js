'use strict';
const assert = require('./assert');
const Promise = require('bluebird');
Promise.config({
    warnings: true,
    longStackTraces: true
});

function Test(suite, title, action, options) {
    this._suite = suite;
    this._title = title;
    this._action = action;
    this._options = options || {};
    this._ran = false;
    
    if (!suite || !title || typeof action !== 'function')
        throw new Error('invalid test()');
}

Test.prototype.run = function (beforeEach, afterEach) {
    return Promise.resolve(beforeEach ? beforeEach() : undefined)
        .then(state => {
            return Promise.resolve(this._action(assert, state))
                .then(() => {
                    return Promise.resolve(afterEach ? afterEach(state) : undefined);
                })
        })
        .then(
            state => {
                this._ran = true;
            },
            err => {
                this._ran = true;
                this._err = err;
            });
};

Test.prototype.getResolution = function() {
    if (!this._ran)
        throw new Error('test has not been run');
       
    if (this._options.fail) {
        if (this._err)
            return [true];
        else
            return [false];
    }
    
    if (this._err)
        return [ false, this._err ];
    else
        return [ true ];
};

Test.prototype.getTitle = function() {
    return this._title;
};

Test.prototype.hasOption = function(option) {
    return !!this._options[option];
};

module.exports = Test;