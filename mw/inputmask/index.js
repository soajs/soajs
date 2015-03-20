'use strict';

/**
 *
 * @param config
 * @param inputmaskSrc
 * @returns {Function}
 */
module.exports = function(config, inputmaskSrc) {
	var core = require("../../modules/soajs.core");
	var validator = core.validator;
	var configSchemaValidator = require('./schemas.js')(validator);
	var inputmask = require("./inputmask.js");

	var returnErrorResponse = function(err, req, res) {
		req.soajs.log.error(err);
		var response = req.soajs.buildResponse(err);
		return res.jsonp(response);
	};

	if(!config) { throw new Error("Inputmask error: Missing configuration"); }

	// Validate Config
	if(Object.keys(config).length === 0) { throw new Error("Inputmask error: Empty configuration"); }

	var configValidate = configSchemaValidator.validate(config, "/soajs");
	if(!configValidate.valid) { throw new Error("Inputmask error: Invalid configuration"); }

	return function(req, res, next) {
		if(!req.soajs) { req.soajs = {}; }

		var apiName = req.route.path;
		req.soajs.inputmaskData = {};

		if(!config.schema.hasOwnProperty(apiName) && !( config.schema.hasOwnProperty('commonFields') && config.schema.commonFields.hasOwnProperty(apiName) )) {
			return next();
		}

		inputmask.mapFormatAndValidate({
			"req": req,
			"apiName": apiName,
			"config": config,
			"inputmaskSrc": inputmaskSrc,
			"configValidator": configSchemaValidator
		}, function(err, data) {
			if(err) { return returnErrorResponse(err, req, res); }
			req.soajs.inputmaskData = data;
			return next();
		});
	};
};