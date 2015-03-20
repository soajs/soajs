'use strict';

var registry = require('./registry/index');
exports.getRegistry = function () {return registry.getRegistry();};
exports.reloadRegistry = function () {return registry.reloadRegistry();};
exports.getLogger = require('./logger/index');
exports.meta = require('./meta/index');
exports.error = require('./error/index');
exports.key = require('./key/index');
exports.provision = require('./provision/index');
exports.security = require('./security/index');
exports.getMail = require('./mail/index');
exports.validator = require('./validator/index');