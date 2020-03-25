"use strict";
/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */

const helper = require("../../helper.js");

let utils = helper.requireModule('./utilities/utils.js');

describe("Testing utilities", () => {
	
	let res = {
		status: () => {
			return {
				send: (input2) => {
					return input2;
				}
			};
		},
		jsonp: () => {
			return 2;
		}
	};
	
	let req = {
		soajs: {
			log: {
				error: (input) => {
					console.error(input);
				}
			},
			buildResponse: (input) => {
				return input;
			}
		},
		is: () => {
			return false;
		}
	};
	
	it("logErrors - number error", (done) => {
		utils.logErrors(123, req, res, () => {
			done();
		});
	});
	
	it("logErrors - object, no code no message", (done) => {
		utils.logErrors({}, req, res, () => {
			done();
		});
	});
	
	it("logErrors - string error", (done) => {
		utils.logErrors("error", req, res, () => {
			done();
		});
	});
	
	it("serviceClientErrorHandler - request without xhr", (done) => {
		utils.serviceClientErrorHandler(null, req, res, () => {
			done();
		});
	});
	it("serviceClientErrorHandler - request xhr", (done) => {
		req.xhr = {};
		utils.serviceClientErrorHandler(null, req, res, () => {
			done();
		});
	});
	
	it("serviceErrorHandler - number error", (done) => {
		req.xhr = {};
		utils.serviceErrorHandler(150, req, res, null);
		done();
	});
	it("serviceErrorHandler - with error", (done) => {
		utils.serviceErrorHandler({"code": 200, "msg": "dummy200"}, req, res, null);
		done();
	});
});