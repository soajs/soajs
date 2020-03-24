'use strict';

var coreModules = require ("soajs.core.modules");
var core = coreModules.core;
var log = null;
/**
 *
 * @param configuration
 * @returns {Function}
 */
module.exports = function (configuration) {
    log = configuration.log;

    return function (req, res, next) {
        if (!req.soajs)
            req.soajs = {};

        req.soajs.log = log;
        req.soajs.registry = core.registry.get();
        req.soajs.meta = core.meta;
        req.soajs.validator = core.validator;
        next();
    };
};
