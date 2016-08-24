'use strict';
const Promise = require('bluebird');
const Suite = require('../lib/suite');

const suite = new Suite('fail fast');

suite.test('callback', (t, done) => {
    function thing(cb) {
        setTimeout(() => {
            cb()
        }, 10);
    }
    
    function thing2(cb) {
        setTimeout(() => {
            cb(new Error('error'))
        }, 10);
    }
    
    thing(t.async(err => {
        thing2(t.async());
    }));
},
(err, t) => {
    t.equals(err.stack, `Error: error
    at Timeout.setTimeout (C:\\projects\\node-test\\test\\long-stack-traces.js:16:16)
From previous event:
    at Assert.t.async.err (C:\\projects\\node-test\\test\\long-stack-traces.js:21:18)
    at Timeout.setTimeout (C:\\projects\\node-test\\test\\long-stack-traces.js:10:13)
From previous event:
    at suite.test (C:\\projects\\node-test\\test\\long-stack-traces.js:20:13)`);
});

suite.test('promises', t => {
    function thing3() {
        return Promise.resolve()
            .then(() => {
                throw new Error('error');
            });
    }
    
    return thing3();
},
(err, t) => {
    console.log(err.stack);
    t.equals(err.stack, `Error: error
    at Promise.resolve.then (C:\\projects\\node-test\\test\\long-stack-traces.js:38:23)
From previous event:
    at thing3 (C:\\projects\\node-test\\test\\long-stack-traces.js:37:14)
    at suite.test.t (C:\\projects\\node-test\\test\\long-stack-traces.js:42:12)
From previous event:
    at Object.<anonymous> (C:\\projects\\node-test\\test\\long-stack-traces.js:34:7)`);
});