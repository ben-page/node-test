'use strict';
const Bluebird = require('bluebird');

function isPromise(obj) {
    if (!obj)
        return false;
    
    if (obj instanceof Promise || obj instanceof Bluebird)
        return true;
    
    return (typeof obj.then === 'function');
}

function runAsync(fn, ...args) {
    //fn()
    if (fn === undefined)
        return Bluebird.resolve(undefined);
    
    //fn(t, done)
    if (fn.length >= 2) {
        switch (args.length) {
            case 1:
                return Bluebird.fromCallback(callback => fn(args[0], callback));
            case 2:
                return Bluebird.fromCallback(callback => fn(args[0], args[1], callback));
            default:
                throw new Error(`missing support for ${args.length} args`);
        }
    }
    
    //fn(t)
    switch (args.length) {
        case 1:
            return Bluebird.try(() => fn(args[0]));
        case 2:
            return Bluebird.try(() => fn(args[0], args[1]));
        default:
            throw new Error(`missing support for ${args.length} args`);
    }
}

module.exports = {
    runAsync,
    isPromise
};