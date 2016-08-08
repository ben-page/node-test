'use strict';
const Promise = require('bluebird');
Promise.config({
    warnings: true,
    longStackTraces: true
});
require('./general');
require('./hooks');
require('./only');
require('./serial');
require('./suite-hooks');
require('./time-out');