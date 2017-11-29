# node-test
`node-test` is a simple, asynchronous test runner. It's designed to address what are limitations of existing Node.js test runners. Writing tests should be just like writing any other code.

## Table of Contents

* [Core Philosophy](#core-philosophy)
* [Comparison With Other Test Runners](#comparison-with-other-test-runners)
* [Installation](#installation)
* [Example](#example)
* [API](#api)
    * [Suite](#suite)
        * [Concurrent Tests](#concurrent-tests)
        * [Serial Tests](#serial-tests)
    * [Hooks](#hooks)
    * [Assertions](#t-built-in-assertion-library)
* [Running Multiple Suites](#running-multiple-suites)
* [Custom Reporters](#custom-reporters)
* [Multiple Library Instances](#multiple-library-instances)
* [Todo](#todo)

## Design

* Runs Tests Concurrently (In Parallel)
* No global variables (no `describe()`, `it()`, etc).
* No CLI required - Running a test file directly (`node test/test-something.js`) produces the same output as using the CLI.
* Long/Async Stack Traces
* Debuggable - Does not fork tests by default.
* No planning tests or counting assertions required.
* Easily Build Asynchronous Tests - via Promises or Callbacks
* Extended assertion library built from the core `assert` module
* Failure Validate - easily test error conditions

## Installation

```sh
$ npm install --save-dev node-test
```

## Example

```js
'use strict';
const Suite = require('node-test');

function funcReturnsPromise() {
    return Promise.resolve(2);
}

function funcWithCallback(cb) {
    cb();
}

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

suite.test('Test 4', (t, done) => {
    funcWithCallback(done);
});

suite.test('Test 5 - Error', t => {
    t.equal(1, 2);
},
(err, t) => {
    t.equal(err.message, '1 === 2');
});

```

Output:
```shell
---My Suite Name---
pass 1 - Test 1 (5ms)
skip 2 - Test 2
todo 3 - Test 3 - Coming Soon
pass 4 - Test 4 (5ms)
pass 5 - Test 5 - Error (4ms)

Total: 3
Passed: 3 100%

Process finished with exit code 0
```

## API

### Suite
A suite is a grouping of tests.

#### Create a Suite

##### `new Suite(name, [options])`- suite constructor
###### Arguments
- `name`: string - title for test

```js
const Suite = require('node-test');

const suite = new Suite('My Suite Name');
```

#### Concurrent Tests
By default `node-test` runs tests concurrently. For concurrent test to work properly, they should also be atomic. They should not depend on other tests for state.

The following methods are used to create concurrent tests.
##### `suite.test(name, action, [validateError])` - Create a new test.
###### Arguments
- `name`: string - title for test
- `action`: function(t, [state], [done]) - test implementation
  - `t`: object - (built-in assertions)
  - `state`: object (optional) - result of `beforeEach` hook
  - `done`: function (optional) - callback for asynchronous tests
- `validateError`: function (optional) - function to validate the error

###### Test Resolution
- Any `Error` throw synchronously will cause the test to fail.
- Asynchronous test can return a Promise or use the `done()` callback.
  - If the test returns a Promise, the test will pass or fail if the promise resolves or rejects, respectively.
  - If the `done()` callback is used, the test will fail if the first argument is defined. See [Node.js style callbacks](https://nodejs.org/api/errors.html#errors_node_js_style_callbacks).
- `validateError` can turn a failing test into a passing test, if the error validates. (see below)  

###### Synchronous Test:
```js
suite.test('My Test', t => {
    const result = funcReturnsNumber();
    t.equal(result, 2);
});
```
###### Test with Promise:
```js
suite.test('My Test', t => {
    return funcReturnsPromise()
        .then(result => {
            t.equal(result, 2);
        });
});
```
###### Tests with a Synchronous Callback
```js
suite.test('My Test', (t, done) => {
    funcWithCallback((err, result) => {
        t.noError(err);
        t.equal(result, 2);
        done();
    });
});

suite.test('My Test 2', (t, done) => {
    funcWithCallbackNoValue(done);
});
```

###### Tests with a Asynchronous Callback
For more info on `t.async()` see Assertion documentation.
```js
suite.test('My Test', (t, done) => {
    funcWithCallback(t.async((err, result) => {
        t.noError(err);
        t.equal(result, 2);
        done();
    }));
});

suite.test('My Test 2', (t, done) => {
    funcWithCallbackNoValue(done);
});
```

##### Error Validation
`validateError` tests that a specific error was throw. This is makes it easy to test error conditions. The test will pass, if `validateError` is passed to the test and does not throw.

###### Passing Test
In this example the main test fails, but `validateError` passes. So the whole test is considered to have pass.
```js
t.throws(() => {
  return Promise.reject(new Error('expected error'));
},
err => {
  t.true(err instanceof Error);
  t.equal(err.message, 'expected error');
});
```

###### Failing Test
In this example the main test fails and `validateError` fails too. The error is not what `validateError` expected, so the test fails.
```js
t.throws(() => {
  return Promise.reject(new Error('expected error'));
},
err => {
  t.equal(err.message, 'other error');
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
- `action`: function(t, done) - test implementation
  - `t`: object - (built-in assertions)
  - `done`: function (optional) - callback for asynchronous tests

#### `suite.after(action)` - Run after all tests in the suite.
###### Arguments
- `name`: string - title for test
- `action`: function(t, done) - test implementation
  - `t`: object - (built-in assertions)
  - `done`: function (optional) - callback for asynchronous tests

#### `suite.beforeEach(action)` - Run before each individual tests in the suite.
###### Arguments
- `name`: string - title for test
- `action`: function(t, [state], [done]) - test implementation
  - `t`: object - (built-in assertions)
  - `done`: function (optional) - callback for asynchronous tests

The `beforeEach` hook runs before each test in the suite.
###### Usage with `suite.beforeEach()`
The beforeEach hook is execute for every individual test, so each test has it's own state. Notice how `state.data` is 2 for both tests, even though the tests modify it.

If `beforeHook` is called, `state` is inserted as the second argument of the test `action` between `t` and `done`.

```js
suite.beforeEach(t => {
    return {
        data: 2
    };
});

suite.test('My Test 1', (t, state) => {
    t.equal(2, state.data);
    state.date = 3;
});

suite.test('My Test 2', (t, state, done) => {
    t.equal(2, state.data);
    done();
});

suite.afterEach((t, state) => {
    state.data = 0;
});
```
#### `suite.afterEach(action)` - Run after each individual tests in the suite.
###### Arguments
- `name`: string - title for test
- `action`: function(t, [state], [done]) - test implementation
  - `t`: object - (built-in assertions)
  - `state`: object (optional) - result of `beforeEach` hook
  - `done`: function (optional) - callback for asynchronous tests

#### Other Members

##### `suite.config(options)` - Set the time limit for tests (default: 5000)
- `options`: object 
  - `failFast`: boolean (default: false) - If a single test fails, stop all remaining tests in the suite.
  - `timeout`: number (default: 5000) - A time out for tests. If test's execution time exceeds the value, the test will fail.

```js
suite.config({
    failFast: false,
    timeout: 10000
});
```

### t (Built-In Assertion Library)
`node-test` includes an assertion library that extends the core assert module.

*For every method, `message` is optional. If defined, it will be displayed if the assertion fails.*
 
 #### `t.pass()` - A positive assertion. 

```js
t.pass();
```

#### `t.fail([message])`
```js
t.fail();
```
#### `t.true(value, [message])`
An assertion that `value` is strictly true.
```js
const value = true;
t.true(value);

const arr = ['a'];
t.true(arr.length === 1);
```
#### `t.false(value, [message])`
An assertion that `value` is strictly false.
```js
const value = false;
t.false(value);
```
#### `t.truthy(value, [message])` alias: `t.assert()`
An assertion that `value` is strictly truthy.
```js
const value = 1;
t.truthy(value);
```
#### `t.falsey(value, [message])`
An assertion that `value` is strictly falsey.
```js
const value = 0;
t.falsey(value);
```
#### `t.equal(value, expected, [message])` aliases: `t.is(), t.equals()`
An assertion that `value` is strictly equal to `expected`.
```js
const value = 1;
t.equal(value, 1);
```
#### `t.notEqual(value, expected, [message])` aliases: `t.not(), t.notEquals()`
An assertion that `value` is strictly not equal to `expected`.
```js
const value = 1;
t.notEqual(value, 2);
```
#### `t.deepEqual(value, expected, [message])`
An assertion that `value` is strictly and deeply equal to `expected`. Deep equality is tested by the [not-so-shallow](https://github.com/sotojuan/not-so-shallow) module.
```js
const value = { data: 1234 };
t.deepEqual(value, { data: 1234 });
```
#### `t.notDeepEqual(value, expected, [message])`
An assertion that `value` is strictly and deeply not equal to `expected`.
```js
const value = { data: 1234 };
t.notDeepEqual(value, { data: 5678 });
```
#### `t.greaterThan(value, expected, [message])`
An assertion that `value` is greater than `expected`.
```js
const value = 2;
t.greaterThan(value, 1);
```
#### `t.greaterThanOrEqual(value, expected, [message])`
An assertion that `value` is greater than or equal to `expected`.
```js
const value = 2;
t.greaterThanOrEqual(value, 2);
```
#### `t.lessThan(value, expected, [message])`
An assertion that `value` is less than `expected`.
```js
const value = 1;
t.lessThan(value, 2);
```
#### `t.lessThanOrEqual(value, expected, [message])`
An assertion that `value` is less than or equal to `expected`. *`message` is optional. If defined, it will be displayed if the assertion fails.
```js
const value = 1;
t.lessThanOrEqual(value, 1);
```
#### `t.noError(error, [message])`
An assertion that `error` is falsey. This is functionally similar to `t.falsey()`, but the assertion error message indicates the failure was due to an `Error`.
```js
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
Passing:
```js
t.notThrows(() => {
    t.equal(1, 1);
});
```
Failing:
```js
t.throws(() => {
    throw new Error('error');
});
```
###### Asynchronous Assertion with Promises
```js
t.notThrows(() => {
    return funcReturnsPromise();
});
```
###### Asynchronous/Synchronous Assertion with Callback
The callback can be asynchronous or synchronous. The callback can be executed immediately or later. It will be handled the same.
```js
t.notThrows(done1 => {
    funcWithAsyncCallback(done1);
});
t.notThrows(done1 => {
    funcWithSyncCallback(done1);
});
```

###### Mixed Synchronous & Asynchronous
Even if an asynchronous mode is used, synchronous errors are caught.
Failing:
```js
t.notThrows(done => {
    funcWithAsyncCallback(done);
    throw new Error('message');
});
t.notThrows(done => {
    throw new Error('message');
    return funcReturnsPromise();
});
```

#### `t.throws(fn, [validateError], [message])`
An assertion that `fn` is function that either throws an Error synchronously or asynchronously (via Promise or callback).
###### Arguments
- `fn`: function([done]) - code to assert throws
  - (optional) `done`: function - callback for asynchronous test
- `validateError`: function - function to validate the error

Except for the `validateError` argument, this functions as the opposite of `t.notThrow()`. That is `throws` passes when there is an Error rather passing when there is no Error. For more usage details, look at the `notThrows` examples.

Passing `validateError` allows testing that the Error received is the Error expected.
```js
t.throws(() => {
    return funcReturnsPromise();
},
err => {
    t.true(err instanceof TypeError);
    t.equal(err.message, 'invalid argument');
});
```

### `t.async([fn], [count])`
An assertion that wraps any asynchronous functions so the test awaits the function being called and ensures asynchronous errors are caught. `t.async` makes it easy to wait on asynchronous callbacks.

###### Arguments
- `fn`: function (optional) - counting function
- `count`: number (optional) - number of times to expect to be called
 
If `fn` is passed, then `async` does not interpret errors from Node-style callback. It simply passed them through.
```js
funcWithAsyncCallback(t.async((err, result) => {
    t.noError(err);
    t.equals(1, result);
}));

setTimeout(t.async(() => {
    t.pass();
}), 200);
```

If `fn` is not passed, then `async` acts as a Node-style callback. If the first argument is treated as an error.

```js
function funcWithAsyncCallback(cb) {
    cb(new Error('error'));
}

funcWithAsyncCallback(t.async());
```

If `count` is passed, the function is expected to be called more than once.
```js
const count = t.count((err, result) => {
    t.noError(err);
}, 2);
funcWithAsyncCallback(count);
funcWithAsyncCallback(count);
```

## Running Multiple Suites
There are couple ways to run multiple suites.

1. The easiest (and least flexible) way to just place multiple suites in a single file.
2. A more flexible way is to create one suite per file and create an index file to run them all.

    A project `test` directory might look like this:
    ```
    suite1.js
    suite2.js
    suite3.js
    ```
    
    Then, create a file named `index.js` like this:
    ```js
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
    
    Now you can run individual suites from the command line.
    ```shell
    > node tests/suite1.js
    > node tests/suite3.js
    ```
    Or you can run the whole thing.
    ```shell
    > npm test
    ```
3. The up coming CLI will make it easier to execute multiple suites without needing to maintain an `index.js`.

## Custom Reporters
A reporter is a simple constructor function that takes an event emitter as it's only argument. The emitter emit four different events.
```js
const Suite = require('node-test');

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

Suite.addReporter(Reporter);
```

### `Suite.addReporter(Reporter)`
Add a reporter to the runner for all suites. If no reporter is added, the default reporter will be used.

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

## Multiple Library Instances
It's possibly to get separate instances of the library. The primarily useful because each suite has it's own reporters.
### `Suite.getNewLibraryCopy()` 
```js
const Suite = require('node-test');
const NewSuite = Suite.getNewLibraryCopy();
```
## Todo

* CLI 
    * file watcher
    * only run certain files (glob matching)
    * harmony flag
 * Support Generator Functions

## Considering
* code coverage
* slow tests
* logging - ala Karma
* support CoffeeScript, TypeScript
* support plugins
