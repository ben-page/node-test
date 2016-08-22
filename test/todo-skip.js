'use strict';
const Promise = require('bluebird');
Promise.config({
    warnings: true,
    longStackTraces: true
});
const Suite = require('../lib/suite');

new Suite('Todo, Skip')
    .test('t.is()', t => {
        t.pass();
    })
    
    .todo('something todo', t => {
        t.fail('should not run');
    })
    
    .todo('something todo 2')

    .skip('skipped', t => {
        t.fail('should not run');
    })
    
    .test('pass 1', t => {
        t.notEquals(1, 2);
    });
    
    // .test('fail', t => {
    //     t.equals(1, 2);
    // });