"use strict";
/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */

const helper = require("../../../helper.js");
const assert = require('assert');

let mockedDataRequest = require('./data.js');

let serviceIndex = helper.requireModule('./mw/service/index.js');

describe("Unit test for: MW Service", function () {
	
	let req = mockedDataRequest;
	let res = {};
	
	it("Test mw", function (done) {
		
		let configuration = {
			"soajs": {}, "app": {}, "param": {}, "core": {}
		};
		let what2expect = {
			id: '5551aca9e179c39b760f7a1a',
			code: 'DBTN',
			locked: undefined,
			type: undefined,
			key:
				{
					iKey: '38145c67717c73d3febd16df38abf311',
					eKey:
						'd44dfaaf1a3ba93adc6b3368816188f96134dfedec7072542eb3d84ec3e3d260f639954b8c0bc51e742c1dff3f80710e3e728edb004dce78d82d7ecd5e17e88c39fef78aa29aa2ed19ed0ca9011d75d9fc441a3c59845ebcf11f9393d5962549'
				},
			application:
				{
					product: 'DSBRD',
					package: 'DSBRD_MAIN',
					appId: '5512926a7a1f0e2123f638de',
					acl: null,
					acl_all_env: null,
					package_acl: null,
					package_acl_all_env: null
				}
		};
		
		let functionMw = serviceIndex(configuration);
		
		functionMw(req, res, function () {
			assert.deepEqual(req.soajs.tenant, what2expect);
			done();
		});
	});
	
	
});