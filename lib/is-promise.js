'use strict';
module.exports = function isPromise(obj) {
    if (!obj)
        return false;
    
    if (obj instanceof Promise)
        return true;
    
    const type = typeof obj;
    return (type === 'object' || type === 'function') && typeof obj.then === 'function';
};