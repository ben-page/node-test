'use strict';
const Suite = require('../lib/suite');

const suite = new Suite('native promises');

suite.test('resolve', t => {
    return new Promise((resolve, reject) => {
        setTimeout(() => resolve('native resolve'), 100);
    })
        .then(v => {
            t.equal(v, 'native resolve');
        });
});

suite.test('reject', t => {
    return new Promise((resolve, reject) => {
        setTimeout(() => reject(new Error('native reject')), 100);
    });
},
(err, t) => {
    t.equal(err.message, 'native reject');
});
