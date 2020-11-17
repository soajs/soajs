'use strict';

/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */

const main_schema = require("./main-schema.js");
const inputmask = require("./inputmask.js");

module.exports = (config, inputmaskSrc, core) => {
	const validator = core.validator;
	const configSchemaValidator = require('./schemas.js')(validator);
	
	let returnErrorResponse = (err, req, res) => {
		let response = req.soajs.buildResponse(err);
		return res.jsonp(response);
	};
	
	if (!config) {
		throw new Error("Inputmask error: Missing configuration");
	}
	
	// Validate Config
	if (Object.keys(config).length === 0) {
		throw new Error("Inputmask error: Empty configuration");
	}
	
	let configValidate = configSchemaValidator.validate(config, main_schema.schema);
	if (!configValidate.valid) {
		//configValidate.errors is an array
		let errMsgs = [];
		configValidate.errors.forEach((oneError) => {
			errMsgs.push(oneError.stack);
		});
		
		//todo: prettify the errMsgs before printing it.
		throw new Error("Inputmask error: Invalid configuration: " + errMsgs);
	}
	
	return (req, res, next) => {
		if (!req.soajs) {
			req.soajs = {};
		}
		
		let apiName = req.route.path;
		req.soajs.inputmaskData = {};
		let method = req.method.toLocaleLowerCase();
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
		}, (err, data) => {
			if (err) {
				return returnErrorResponse(err, req, res);
			}
			req.soajs.inputmaskData = data;
			return next();
		});
	};
};