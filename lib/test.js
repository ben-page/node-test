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

Test.prototype.getResolution = function() {
    if (!this._ran)
        return 'stop';

    if (this._options.skip)
        return 'skip';
        
    if (this._options.todo)
        return 'todo';
    
    if (this._err)
        return 'fail';
    else
        return 'pass';
};

Test.prototype.getError = function() {
    return this._err;
};

Test.prototype.getTitle = function() {
    return this._title;
};

Test.prototype.hasOption = function(option) {
    return !!this._options[option];
};

module.exports = Test;