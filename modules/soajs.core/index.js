'use strict';

var registry = require('./registry/index');
exports.getRegistry = function (serviceName, apiList, cb) {
    return registry.getRegistry(serviceName, apiList, false, cb);
};
exports.reloadRegistry = function (serviceName, apiList, cb) {
    return registry.getRegistry(serviceName, apiList, true, cb);
};
exports.getLogger = require('./logger/index');
exports.meta = require('./meta/index');
exports.error = require('./error/index');
exports.key = require('./key/index');
exports.provision = require('./provision/index');
exports.security = require('./security/index');
exports.getMail = require('./mail/index');
exports.validator = require('./validator/index');