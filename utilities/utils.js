'use strict';

/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */

const coreModules = require("soajs.core.modules");
const jsonxml = require('jsontoxml');
let core = coreModules.core;

//-------------------------- ERROR Handling MW - service & controller
/**
 *
 * @param err
 * @param req
 * @param res
 * @param next
 */
function logErrors(err, req, res, next) {
	if (typeof err === "number") {
		req.soajs.log.error(core.error.generate(err).message);
		return next(err);
	}
	if (typeof err === "object") {
		if (err.code && err.message) {
			req.soajs.log.error(err.message);
			if (err.name === "OAuth2Error") {
				return next({"code": err.code, "status": err.code, "msg": err.message});
			} else {
				return next({"code": err.code, "msg": err.message});
			}
		} else if (err.code && err.msg) {
			err.message = err.msg;
			req.soajs.log.error(err.message);
			return next(err);
		} else {
			req.soajs.log.error(err.message || err);
			req.soajs.log.error(core.error.generate(164).message);
		}
	} else {
		req.soajs.log.error(err);
		req.soajs.log.error(core.error.generate(164).message);
	}
	
	return next(core.error.getError(164));
}

//-------------------------- ERROR Handling MW - service
/**
 *
 * @param err
 * @param req
 * @param res
 * @param next
 */
function serviceClientErrorHandler(err, req, res, next) {
	if (req.xhr) {
		req.soajs.log.error(core.error.generate(150));
		return next(150);
	} else {
		return next(err);
	}
}

/**
 *
 * @param err
 * @param req
 * @param res
 * @param next
 */
function serviceErrorHandler(err, req, res, next) {
	if (err && err.status) {
		res.status(err.status);
	} else {
		res.status(500);
	}
	if (err.code && err.msg) {
		let obj = req.soajs.buildResponse(err);
		if (req.is('xml')) {
			res.header('Content-Type', 'text/xml');
			let objJSON = {
				"result": obj.result,
				"errors": obj.errors
			};
			let xml = jsonxml(objJSON);
			res.end(xml);
		} else {
			res.jsonp(obj);
		}
	} else {
		let obj = req.soajs.buildResponse(core.error.getError(err));
		if (req.is('xml') && next) {
			res.header('Content-Type', 'text/xml');
			let objJSON = {
				"result": obj.result,
				"errors": obj.errors
			};
			let xml = jsonxml(objJSON);
			res.end(xml);
		} else {
			res.jsonp(obj);
		}
	}
}


module.exports = {
	logErrors, // common for service and controllers
	serviceClientErrorHandler,
	serviceErrorHandler
};