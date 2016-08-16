# node-test
`node-test` is a simple, asynchronous test runner. It's designed to address what are limitations of existing Node.js test runners. Writing tests should be just like writing any other code.

## Table of Contents

* [Core Philosophy](#core-philosophy)
* [Comparison With Other Test Runners](#comparison-with-other-test-runners)
* [Install](#install)
* [Example](#example)
* [API](#api)
    * [Suite](#suite)
        * [Concurrent Tests](#concurrent-tests)
        * [Serial Tests](#serial-tests)
    * [Hooks](#hooks)
    * [Assertions](#t-built-in-assertion-library)
* [Running Multiple Suites](#running-multiple-suites)
* [Custom Reporters](#custom-reports)
* [Todo](#todo)

## Core Philosophy

* Fast - Concurrent Tests
* No global variables
* Optional CLI  - Running a test file directly (`node test/test-something.js`) produces the same output as using the CLI.
* Minimal - Just runs your tests and gives you the results. There's no fancy error interpretation, just a plain old Node.js error callstack.
* No planning tests or counting assertions.
* Asynchronous Tests - Prefers Promises, but supports Callbacks
* Built-In assertion library build on the core `assert` module

## Comparison With Other Test Runners

These test runners have many great features and heavily inspired this module. However, there are key differences.

#### [Mocha](https://mochajs.org/), [Jasmine](http://jasmine.github.io/)
1. Tests are run serially (one at a time).
2. Defaults to using global variables (`describe()`, `it()`, etc).
3. Mocha CLI is required, directly running a mocha test files fails.

#### [tape](https://github.com/substack/tape)
1. Tests are run serially (one at a time).
2. The number of assertions has to be manually counted and planned (`t.plan()`) for every test.

#### [ava](https://github.com/avajs/ava)
1. Ava CLI is required, so directly running a test files fails.
2. Ava's stack trace interpreter often removes helpful information, accesses properties on your object (causing side effects), and can interfere with other libraries built in error reporting (ie. Long Stack Traces)

## Install

```sh
$ npm install --save-dev node-test
```

## Example

```javascript
'use strict';
const Suite = require('node-test');

const suite = new Suite('My Suite Name');
suite.test('Test 1', t => {
    return funcReturnsPromise()
        .then(result => {
            t.equal(result, 2);
        });
});

suite.skip('Test 2', t => {
    throw new Error('skipped');
});

suite.todo('Test 3 - Coming Soon');

suite.test('Test 4', (t, state, done) => {
    funcWithCallback(done);
});

suite.failing('Test 5 - Need to fix this', t => {
    t.equal(1+1, 3);
});

```

Output:
```shell
----My Suite Name----
pass 1 - Test 1
skip 2 - Test 2
todo 3 - Test 3 - Coming Soon
pass 4 - Test 4
fail 5 - Test 5 - Need to fix this #failing test

Total: 3
Failed: 1 (5)
Passed: 2 67%


Process finished with exit code 0
```

## API

### Suite
The first thing you do with `node-test` is create a suite for your tests.
##### `new Suite(name, [options])`- suite constructor
###### Arguments
- `name`: string - title for test
- `options`: object 
  - `failFast`: boolean (default: false) - if a single test fails, stop all remaining tests in the suite

```javascript
const Suite = require('node-test');

const suite = new Suite('My Suite Name');
```

#### Concurrent Tests
By default `node-test` runs tests concurrently. Concurrency means that the tests must be atomic. They should not depend on other tests for state.

The following methods are used to create concurrent tests.
##### `suite.test(name, action)` - Create a new test.
###### Arguments
- `name`: string - title for test
- `action`: function(t, state, done) - test implementation
  - `t`: object (built-in assertions)
  - (optional) `state`: object - result of `beforeEach` hook
  - (optional) `done`: function - callback for asynchronous tests

###### Test Resolution
- Any `Error` throw synchronously will cause the test to fail.
- Asynchronous test can return a Promise or use the `done()` callback.
  - If the test returns a Promise, the test will pass or fail if the promise resolves or rejects, respectively.
  - If the `done()` callback is used, the test will fail if the first argument is defined. See [Node.js style callbacks](https://nodejs.org/api/errors.html#errors_node_js_style_callbacks).

###### Synchronous Test:
```javascript
suite.test('My Test', t => {
    const result = funcReturnsNumber();
    t.equal(result, 2);
});
```
###### Asynchronous Test with Promises:
```javascript
suite.test('My Test', t => {
    return funcReturnsPromise()
        .then(result => {
            t.equal(result, 2);
        });
});
```
###### Asynchronous Tests with a Callback
```javascript
suite.test('My Test', (t, state, done) => {
    funcWithCallback((err, result) => {
        t.noError(err);
        t.equal(result, 2);
    });
});

suite.test('My Test 2', (t, state, done) => {
    funcWithCallbackNoValue(done);
});
```

##### `suite.skip(name, action)` - Creates a new test that will be skipped when the suite is run.
###### Arguments
Same as `suite.test()`.

##### `suite.only(name, action)` - Creates a new test that will be run exclusively.
When the suite run, `only` tests will be run and all other tests will be skipped.
###### Arguments
Same as `suite.test()`.

##### `suite.todo(name)` - Creates a test placeholder.
The "test" will be shown in the output, but will not count toward the total.
###### Arguments
- `name`: string - title for test

##### `suite.failing(name, action)` - Creates a new test that is expected to fail.
The test included as a failed test in the output, but don't cause the exit code to change (indicating the build failed).
###### Arguments
Same as `suite.test()`.

#### Serial Tests
`node-test` also supports serial tests (one at a time). Most of the time concurrent test are preferable, however there are times (such as when accessing a database) that you may want tests to run serially.

Within a suite, serial tests are executed first followed by any concurrent tests. However, multiple suites are run concurrently. So two serial tests could run at the same time if they are members of different suites.

The following methods are used to create serial tests. There usage is identical to the equivalent concurrent method.
##### `suite.serial.test(name, action)`
###### Arguments
Same as `suite.test()`.

##### `suite.serial.skip(name, action)`
###### Arguments
Same as `suite.test()`.

##### `suite.serial.only(name, action)`
###### Arguments
Same as `suite.test()`.

##### `suite.serial.todo(name)`
###### Arguments
Same as `suite.test()`.

##### `suite.serial.failing(name, action)`
###### Arguments
Same as `suite.test()`.

### Hooks
`node-test` provides four hooks. The hooks are run serially to the tests.

#### `suite.before(action)` - Run before all tests in the suite.
###### Arguments
- `name`: string - title for test
- `action`: function(t, state, done) - test implementation
  - `t`: object (built-in assertions)
  - (optional) `done`: function - callback for asynchronous tests

#### `suite.after(action)` - Run after all tests in the suite.
###### Arguments
Same as `suite.before()`.

#### `suite.beforeEach(action)` - Run before each individual tests in the suite.
###### Arguments
Same as `suite.before()`.

The `beforeEach` hook runs before each test in the suite.
###### Usage with `suite.beforeEach()`
```javascript
suite.beforeEach(t => {
    return {
        data: 2
    };
});

suite.test('My Test 1', (t, state) => {
    t.equal(1+1, state.data);
    state.date = 3;
});

suite.test('My Test 2', (t, state) => {
    t.equal(2, state.data); //state is still 2, because beforeEach is run individual for each test
});
```
#### `suite.afterEach(action)` - Run after each individual tests in the suite.
###### Arguments
Same as `suite.before()`.

#### Other Members

##### `suite.setTimeout(delay)` - Set the time limit for tests (default: 5000)
Tests whose execution time exceeds the delay will fail.
###### Arguments
- `delay`: number - timeout in milliseconds

### t (Built-In Assertion Library)
`node-test` includes an assertion library that is a bit more feature rich than the core assert module.
 * For every method, `message` is optional. If defined, it will be displayed if the assertion fails.*
 
#### `t.pass()`
```javascript
t.pass();
```
#### `t.fail([message])`
```javascript
t.fail();
```
#### `t.true(value, [message])`
An assertion that `value` is strictly true.
```javascript
const value = true;
t.true(value);

const arr = ['a'];
t.true(arr.length === 1);
```
#### `t.false(value, [message])`
An assertion that `value` is strictly false.
```javascript
const value = false;
t.false(value);
```
#### `t.truthy(value, [message])` alias: `t.assert()`
An assertion that `value` is strictly truthy.
```javascript
const value = 1;
t.truthy(value);
```
#### `t.falsey(value, [message])`
An assertion that `value` is strictly falsey.
```javascript
const value = 0;
t.falsey(value);
```
#### `t.equal(value, expected, [message])` aliases: `t.is(), t.equals()`
An assertion that `value` is strictly equal to `expected`.
```javascript
const value = 1;
t.equal(value, 1);
```
#### `t.notEqual(value, expected, [message])` aliases: `t.not(), t.notEquals()`
An assertion that `value` is strictly not equal to `expected`.
```javascript
const value = 1;
t.notEqual(value, 2);
```
#### `t.deepEqual(value, expected, [message])`
An assertion that `value` is strictly and deeply equal to `expected`. Deep equality is tested by the [not-so-shallow](https://github.com/sotojuan/not-so-shallow) module.
```javascript
const value = { data: 1234 };
t.deepEqual(value, { data: 1234 });
```
#### `t.notDeepEqual(value, expected, [message])`
An assertion that `value` is strictly and deeply not equal to `expected`.
```javascript
const value = { data: 1234 };
t.notDeepEqual(value, { data: 5678 });
```
#### `t.greaterThan(value, expected, [message])`
An assertion that `value` is greater than `expected`.
```javascript
const value = 2;
t.greaterThan(value, 1);
```
#### `t.greaterThanOrEqual(value, expected, [message])`
An assertion that `value` is greater than or equal to `expected`.
```javascript
const value = 2;
t.greaterThanOrEqual(value, 2);
```
#### `t.lessThan(value, expected, [message])`
An assertion that `value` is less than `expected`.
```javascript
const value = 1;
t.lessThan(value, 2);
```
#### `t.lessThanOrEqual(value, expected, [message])`
An assertion that `value` is less than or equal to `expected`. *`message` is optional. If defined, it will be displayed if the assertion fails.
```javascript
const value = 1;
t.lessThanOrEqual(value, 1);
```
#### `t.noError(error, [message])`
An assertion that `error` is falsey. This is functionally similar to `t.falsey()`, but the assertion error message indicates the failure was due to an `Error`.
```javascript
funcWithCallback((err, result) => {
    t.noError(err);
});
```
#### `t.notThrows(fn, [message])`
An assertion that `fn` is function that does not throws an Error synchronously nor asynchronously (via Promise or callback).
###### Arguments
- `fn`: function([done]) - code to assert throws
  - (optional) `done`: function - callback for asynchronous test

###### Synchronous Assertion
Would Pass:
```javascript
t.notThrows(() => {
    t.equal(1, 1);
});
```
Would Fail:
```javascript
t.throws(() => {
    throw new Error('error');
});
```
###### Asynchronous Assertion with Promises
```javascript
t.notThrows(() => {
    return funcReturnsPromise();
});
```
###### Asynchronous/Synchronous Assertion with Callback
The callback can be asynchronous or synchronous. The callback can be executed immediately or later. It will be handled the same.
```javascript
t.notThrows(done1 => {
    funcWithAsyncCallback(done1);
});
t.notThrows(done1 => {
    funcWithSyncCallback(done1);
});
t.notThrows(done1 => {
    funcWithCallback((err, result) => {
        t.noError(err);
        t.equal(result, 2);
        done1();
    });
});
```
Even if an asynchronous mode is used, synchronous errors are caught.
###### Mixed Synchronous & Asynchronous
Would Fail:
```javascript
t.notThrows(done => {
    funcWithAsyncCallback(done);
    throw new Error('message');
});
t.notThrows(done => {
    throw new Error('message');
    return funcReturnsPromise();
});
```

#### `t.throws(fn, [errTestFn], [message])`
An assertion that `fn` is function that either throws an Error synchronously or asynchronously (via Promise or callback).
###### Arguments
- `fn`: function([done]) - code to assert throws
  - (optional) `done`: function - callback for asynchronous test
- `errTestFn`: function() - code to test the error

Except for the `errTestFn` argument, this functions as the opposite of `t.notThrow()`. That is `throws` passes when there is an Error rather passing when there is no Error. For more usage details, look at the `notThrows` examples.

Passing `errTestFn` allows testing that the Error received is the Error expected.
```javascript
t.throws(() => {
    return funcReturnsPromise();
},
err => {
    t.true(err instanceof TypeError);
    t.equal(err.message, 'invalid argument');
});
```

#### `t.count(fn, count, [message])`
An asynchronous assertion that `fn` eventually executes a callback a precise number of times.

```javascript
t.count(done1 => {
    funcWithCallback(done1);
    funcWithCallback(done1);
    funcWithCallback(done1);
}, 3);
```

## Running Multiple Suites
There are couple ways to run multiple suites.
1. The easiest (and least flexible) way to just place multiple suites in a single file.
2. A more flexible way is to create one suite per file and create an index file to run them all.

    Imagine your `test` directory looks like this:
    ```
    suite1.js
    suite2.js
    suite3.js
    ```
    
    You could create a file called `index.js` with these contents:
    ```javascript
    'use strict';
    require('./suite1');
    require('./suite2');
    require('./suite3');
    ```
    
    Then add the script to your `package.json` file:
    ```json
    "scripts": {
      "test": "node test/index.js"
    }
    ```
    
    Now you can run individual suites or the whole thing from the command line.
    ```shell
    node tests/suite1.js
    npm test
    ```
3. The up coming CLI will make it easier to execute multiple suites without needing to maintain an `index.js`.

## Custom Reporters
A reporter is a simple constructor function that takes an event emitter as it's only argument. The emitter emit four different events.
```javascript
function Reporter(emitter) {
    emitter.on('start', root => {
        console.log('testing started');
    });
    
    emitter.on('testEnd', test => {
        
    });
    
    emitter.on('suiteEnd', suite => {
        
    });
    
    emitter.on('end', () => {
    });
}
```

### Event: `start`
Emitted before tests start running.
#### `root => { }`
- `root`: object
    - `suites`: array - suites that will be run (see `suiteEnd` for suite structure)

### Event: `testEnd`
Emitted after a test has completed.
#### `test => { }`
- `test`: object
    - `name`: string - name of test
    - `suite`: object - suite the test belongs to
    - `status`: string - `pass`, `fail`, `todo`, `skip`, or `stop`
    - `runTime`: number - run time of test in milliseconds

### Event: `suiteEnd`
Emitted after a suite has completed.
#### `suite => { }`
- `suite`: object
    - `name`: string - name of test
    - `err`: Error|undefined - suite level errors, such as beforeAll and afterAll hook errors
    - `tests`: array - all tests in the suite (see `testEnd` for test structure)

### Event: `end`
Emitted when all suites are completed.

## Todo

* CLI 
    * file watcher
    * only run certain files (glob matching)
    * harmony flag

## Considering
* code coverage
* slow tests
* logging - ala Karma
* support CoffeeScript, TypeScript
* support plugins
