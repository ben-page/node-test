'use strict';
const Promise = require('bluebird');
Promise.config({
    warnings: true,
    longStackTraces: true
});
require('./assertions');
require('./errors');
require('./fail-fast');
require('./todo-skip');
require('./hooks');
require('./native-promises');
require('./only');
require('./reporter');
require('./serial');
require('./suite-hooks');
require('./time-out');