'use strict';

/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */

const soajsRes = require("./response.js");

/**
 *
 * @param configuration
 * @returns {Function}
 */
module.exports = function (configuration) {
	let errors = configuration.errors || null;
	let status = configuration.status || null;
	
	return (req, res, next) => {
		if (!req.soajs) {
			req.soajs = {};
		}
		req.soajs.buildResponse = (error, data) => {
			let response = null;
			if (error) {
				response = new soajsRes(false);
				if (Array.isArray(error)) {
					let len = error.length;
					for (let i = 0; i < len; i++) {
						response.addErrorCode(error[i].code, error[i].msg);
					}
				} else {
					response.addErrorCode(error.code, error.msg);
				}
			} else {
				response = new soajsRes(true, data);
			}
			
			return response;
		};
		req.soajs.getError = (errorCode) => {
			let errorObj = {"code": errorCode};
			if (errorCode && errors && errors[errorCode]) {
				errorObj.msg = errors[errorCode];
			}
			if (errorCode && status && status[errorCode]) {
				errorObj.status = status[errorCode];
			}
			
			return errorObj;
		};
		
		next();
	};
};

