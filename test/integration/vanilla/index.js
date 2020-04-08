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

const assert = require('assert');

describe("Integration for vanilla", function () {
	
	let config = require('./config.js');
	config.packagejson = {
		"version": "1.0.0",
		"dependencies": {}
	};
	const service = new soajs.server.service(config);
	
	before((done) => {
		
		service.init(() => {
			
			//GET methods
			
			service.get("/hello", function (req, res) {
				return res.json(req.soajs.buildResponse(null, {"hello": "world"}));
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
	
	it("Get /hello", function (done) {
		let options = {
			uri: 'http://127.0.0.1:4107/hello',
			headers: {
				'Content-Type': 'application/json'
			}
		};
		requester('get', options, (error, body) => {
			assert.ok(body);
			assert.ok(body.errors);
			assert.deepEqual(body.errors.codes, [142]);
			done();
		});
	});
	
	it("Get /heartbeat", function (done) {
		let options = {
			uri: 'http://127.0.0.1:5107/heartbeat',
			headers: {
				'Content-Type': 'application/json'
			}
		};
		requester('get', options, (error, body) => {
			assert.ok(body);
			assert.deepEqual(body.result, true);
			done();
		});
	});
	
	it("Get /resourceInfo", function (done) {
		let options = {
			uri: 'http://127.0.0.1:5107/resourceInfo',
			headers: {
				'Content-Type': 'application/json'
			}
		};
		requester('get', options, (error, body) => {
			assert.ok(body);
			assert.deepEqual(body.result, true);
			done();
		});
	});
});