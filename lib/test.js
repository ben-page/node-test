'use strict';
const util = require('./util');

function Test(title, action, options) {
    this._title = title;
    this._action = action;
    this._options = options || {};
    this._ran = false;
    
    if (!title || (!this._options.todo && typeof action !== 'function'))
        throw new Error('invalid test()');
}

Test.prototype.run = function (beforeEach, afterEach) {
    return util.runAsync0(beforeEach)
        .then(state => {
            return util.runAsync1(this._action, state)
                .return(state);
        })
        .then(state => {
            return util.runAsync1(afterEach, state);
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