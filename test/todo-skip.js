'use strict';
const Suite = require('../lib/Suite');
const t = require('../lib/assert');

new Suite('Todo, Skip')
    .test('t.is()', () => {
        t.pass();
    })
    
    .todo('something todo', () => {
        t.fail('should not run');
    })
    
    .todo('something todo 2')

    .skip('skipped', () => {
        t.fail('should not run');
    })
    
    .test('pass 1', () => {
        t.notEquals(1, 2);
    });
    
    // .test('fail', () => {
    //     t.equals(1, 2);
    // });