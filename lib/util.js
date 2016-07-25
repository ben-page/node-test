'use strict';
const assert = require('./assert');
const Promise = require('bluebird');

function runAsync0(fn) {
    if (fn === undefined)
        return Promise.resolve(undefined);
    
    if (fn.length >= 2) { //done callback has been passed
        return Promise.fromCallback((callback) => {
            fn(assert, callback);
        });
    }
    
    return Promise.try(() => {
        return fn(assert);
    });
}

function runAsync1(fn, state) {
    if (fn === undefined)
        return Promise.resolve(undefined);
    
    if (fn.length > 2) { //done callback has been passed
        return Promise.fromCallback((callback) => {
            fn(assert, state, callback);
        });
    }
    
    return Promise.try(() => {
        return fn(assert, state);
    });
}

module.exports = {
    runAsync0,
    runAsync1
};