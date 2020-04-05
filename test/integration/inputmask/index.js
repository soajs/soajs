'use strict';

/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */

const helper = require("../../helper.js");
const soajs = helper.requireModule('./index.js');
const requester = require('../requester');
const _ = require("lodash");
const assert = require("assert");

describe("Integration for inputmask", function () {
	
	let config = require('./config.js');
	let scenarios = require('./scenarios.js');
	
	config.packagejson = {
		"version": "1.0.0",
		"dependencies": {}
	};
	
	_.forEach(scenarios, function (scenario) {
		config.schema[scenario.u] = scenario.im;
	});
	
	const service = new soajs.server.service(config);
	
	before((done) => {
		
		service.init(() => {
			
			_.forEach(scenarios, function (scenario) {
				service[scenario.m](scenario.u, function (req, res) {
					req.soajs.log.info('Test:' + scenario.u + ' ' + scenario.m);
					let data = {};
					_.forEach(scenario.im, function (info, input) {
						data[input] = req.soajs.inputmaskData[input];
					});
					res.json(req.soajs.buildResponse(null, data));
				});
			});
			
			service.start(() => {
				done();
			});
		});
	});
	
	after((done) => {
		service.stop(() => {
			done();
		});
	});
	
	_.forEach(scenarios, function(scenario) {
		describe('Testing InputMask: ' + scenario.m + ' http://localhost:' + config.servicePort + "/", function() {
			_.forEach(scenario.tests, function(test) {
				let testDescription = 'Testing ' + scenario.m + test.u;
				if(test.p !== undefined) testDescription += ' post:' + JSON.stringify(test.p);
				if(test.desc !== undefined) testDescription += ' desc:' + JSON.stringify(test.desc);
				if(test.skip) {
					it.skip(testDescription, function(done) {
						done();
					});
				}
				else if(test.only) {
					it(testDescription, function(done) {
						requester(((scenario.m === 'delete') ? 'del' : scenario.m), {
							uri: 'http://localhost:' + config.servicePort + test.u,
							body: test.p,
							form: test.pf
						}, function(err, body) {
							assert.ifError(err);
							assert.deepEqual(body, test.r);
							done();
						});
					});
				} else {
					it(testDescription, function(done) {
						requester(((scenario.m === 'delete') ? 'del' : scenario.m), {
							uri: 'http://localhost:' + config.servicePort + test.u,
							body: test.p,
							form: test.pf
						}, function(err, body) {
							console.log(body)
							assert.ifError(err);
							assert.deepEqual(body, test.r);
							done();
						});
					});
				}
			});
		});
	});
	
});