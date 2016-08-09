'use strict';
const Promise = require('bluebird');
Promise.config({
    warnings: true,
    longStackTraces: true
});
require('./assertions');
require('./errors');
require('./fail-fast');
require('./fail-fast-serial');
require('./todo-skip');
require('./hooks');
require('./only');
require('./serial');
require('./suite-hooks');
require('./time-out');