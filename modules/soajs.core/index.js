'use strict';

var registry = require('./registry/index');
exports.getRegistry = function (param, cb) {
    if (!param) param = {};
    param.reload = false;
    return registry.getRegistry(param, cb);
};
exports.reloadRegistry = function (param, cb) {
    if (!param) param = {};
    param.reload = false;
    param.designatedPort = null;
    return registry.getRegistry(param, null, cb);
};
exports.getLogger = require('./logger/index');
exports.meta = require('./meta/index');
exports.error = require('./error/index');
exports.key = require('./key/index');
exports.provision = require('./provision/index');
exports.security = require('./security/index');
exports.getMail = require('./mail/index');
exports.validator = require('./validator/index');