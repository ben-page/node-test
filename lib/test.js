'use strict';
const assert = require('./assert');
const Promise = require('bluebird');

function Test(title, action, options) {
    this._title = title;
    this._action = action;
    this._options = options || {};
    this._ran = false;
    
    if (!title || typeof action !== 'function')
        throw new Error('invalid test()');
}

Test.prototype.run = function (beforeEach, afterEach) {
    return Promise.resolve(beforeEach ? beforeEach(assert) : undefined)
        .then(state => {
            if (this._action.length > 1) {
                return new Promise(resolve => {
                    this._action(assert, state, () => resolve());
                });
            }
            
            return Promise.resolve(this._action(assert, state))
                .then(() => {
                    return Promise.resolve(afterEach ? afterEach(assert, state) : undefined);
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