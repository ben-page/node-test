'use strict';
const Suite = require('../lib/Suite');
const t = require('../lib/assert');

const suite = new Suite('fail fast');

suite.test('callback', () => {
    function thing() {
        setImmediate(() => {
            setTimeout(() => {
                throw new Error('error');
            }, 10);
        });
    }

    thing();
},
err => {
    t.equals(err.stack, `Error: error
    at Timeout.setTimeout [as _onTimeout] (C:\\projects\\node-test\\test\\long-stack-traces.js:11:23)
Async call from Timeout:
    at Immediate.setImmediate (C:\\projects\\node-test\\test\\long-stack-traces.js:10:13)
Async call from Immediate:
    at thing (C:\\projects\\node-test\\test\\long-stack-traces.js:9:9)
    at suite.test (C:\\projects\\node-test\\test\\long-stack-traces.js:16:5)
Async call from node-test.Test:
    at Object.<anonymous> (C:\\projects\\node-test\\test\\long-stack-traces.js:7:7)`);
});

suite.test('promises', () => {
    function thing() {
        return new Promise((resolve, reject) => {
            setImmediate(() => {
                setTimeout(() => {
                    reject(new Error('error'));
                }, 100);
            });
        });
    }

    thing();
},
err => {
    t.equals(err.stack, `Error: error
    at Timeout.setTimeout [as _onTimeout] (C:\\projects\\node-test\\test\\long-stack-traces.js:35:28)
Async call from Timeout:
    at Immediate.setImmediate (C:\\projects\\node-test\\test\\long-stack-traces.js:34:17)
Async call from Immediate:
    at Promise (C:\\projects\\node-test\\test\\long-stack-traces.js:33:13)
    at thing (C:\\projects\\node-test\\test\\long-stack-traces.js:32:16)
    at suite.test (C:\\projects\\node-test\\test\\long-stack-traces.js:41:5)
Async call from node-test.Test:
    at Object.<anonymous> (C:\\projects\\node-test\\test\\long-stack-traces.js:30:7)`);
});