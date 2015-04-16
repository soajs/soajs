'use strict';

var core = require('../../modules/soajs.core');
var registry = null;
var log = null;
/**
 *
 * @param configuration
 * @returns {Function}
 */
module.exports = function (configuration) {
    log = configuration.log;

    return function (req, res, next) {
        registry = configuration.registry;
        if (!req.soajs)
            req.soajs = {};

        req.soajs.log = log;
        req.soajs.registry = registry;
        req.soajs.meta = core.meta;
        req.soajs.validator = core.validator;
        next();
    };
};
