'use strict';

/**
 *
 * @param config
 * @param inputmaskSrc
 * @returns {Function}
 */
module.exports = function (config, inputmaskSrc) {
    var coreModules = require ("soajs.core.modules");
    var core = coreModules.core;
    var validator = core.validator;
    var configSchemaValidator = require('./schemas.js')(validator);
    var inputmask = require("./inputmask.js");

    var returnErrorResponse = function (err, req, res) {
        req.soajs.log.error(err);
        var response = req.soajs.buildResponse(err);
        return res.jsonp(response);
    };

    if (!config) {
        throw new Error("Inputmask error: Missing configuration");
    }

    // Validate Config
    if (Object.keys(config).length === 0) {
        throw new Error("Inputmask error: Empty configuration");
    }

    var configValidate = configSchemaValidator.validate(config, "/soajs");
    if (!configValidate.valid) {
        //configValidate.errors is an array
        var errMsgs = [];
        configValidate.errors.forEach(function (oneError) {
            errMsgs.push(oneError.stack);
        });

        //todo: prettify the errMsgs before printing it.
        throw new Error("Inputmask error: Invalid configuration: " + errMsgs);
    }

    return function (req, res, next) {
        if (!req.soajs) {
            req.soajs = {};
        }

        var apiName = req.route.path;
        req.soajs.inputmaskData = {};
        var method = req.method.toLocaleLowerCase();
        if (!(Object.hasOwnProperty.call(config.schema, apiName) || (Object.hasOwnProperty.call(config.schema, method) && Object.hasOwnProperty.call(config.schema[method], apiName)))) {
            return next();
        }

        inputmask.mapFormatAndValidate({
            "req": req,
            "method": method,
            "apiName": apiName,
            "config": config,
            "inputmaskSrc": inputmaskSrc,
            "configValidator": configSchemaValidator
        }, function (err, data) {
            if (err) {
                return returnErrorResponse(err, req, res);
            }
            req.soajs.inputmaskData = data;
            return next();
        });
    };
};