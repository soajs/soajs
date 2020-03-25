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

describe("Integration for inputmask", function () {
	
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
	
	it("Get permissions - no logged in user", function (done) {
		let options = {
			uri: 'http://127.0.0.1:4107/hello',
			headers: {
				'Content-Type': 'application/json'
			}
		};
		requester('get', options, (error, body) => {
			console.log(error);
			console.log(body.errors);
			done();
		});
	});
});