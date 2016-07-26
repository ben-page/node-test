'use strict';
const Bluebird = require('bluebird');

function isPromise(obj) {
    if (!obj)
        return false;
    
    if (obj instanceof Promise || obj instanceof Bluebird)
        return true;
    
    return (typeof obj.then === 'function');
}

//intelligently promisify a callback function with 1 arguments
function runAsync0(fn, arg1) {
    if (fn === undefined)
        return Bluebird.resolve(undefined);
    
    if (fn.length >= 2) { //done callback has been passed
        return Bluebird.fromCallback(callback => {
            fn(arg1, callback);
        });
    }
    
    return Bluebird.try(() => {
        return fn(arg1);
    });
}

//intelligently promisify a callback function with 2 argument
function runAsync1(fn, arg1, arg2) {
    if (fn === undefined)
        return Bluebird.resolve(undefined);
    
    if (fn.length > 2) { //done callback has been passed
        return Bluebird.fromCallback(callback => {
            fn(arg1, arg2, callback);
        });
    }
    
    return Bluebird.try(() => {
        return fn(arg1, arg2);
    });
}

module.exports = {
    runAsync0,
    runAsync1,
    isPromise
};