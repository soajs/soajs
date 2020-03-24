"use strict";
/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */

const helper = require("../../../helper.js");

let mockedDataRequest = require('./data.js');

let serviceIndex = helper.requireModule('./mw/service/index.js');

describe("Unit test for: MW Service", function () {
	
	let req = mockedDataRequest;
	let res = {};
	
	it("Test mw", function (done) {
		
		let configuration = {
			"soajs": {}, "app": {}, "param": {}, "core": {}
		};
		let functionMw = serviceIndex(configuration);
		
		functionMw(req, res, function () {
			console.log(req.soajs);
			done();
		});
	});
	
	
});