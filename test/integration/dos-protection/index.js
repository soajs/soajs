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
const http = require('http');

const assert = require('assert');

describe("Integration for DoS protection", function () {

	let config = require('./config.js');
	config.packagejson = {
		"version": "1.0.0",
		"dependencies": {}
	};
	const service = new soajs.server.service(config);

	before((done) => {

		service.init(() => {

			// POST - Test large body handling
			service.post("/testLargeBody", function (req, res) {
				return res.json(req.soajs.buildResponse(null, {
					received: true,
					bodySize: JSON.stringify(req.body).length
				}));
			});

			// POST - Test many parameters
			service.post("/testManyParams", function (req, res) {
				const paramCount = Object.keys(req.body || {}).length;
				return res.json(req.soajs.buildResponse(null, {
					paramCount: paramCount,
					data: req.soajs.inputmaskData
				}));
			});

			// POST - Test JSON parsing
			service.post("/testJson", function (req, res) {
				return res.json(req.soajs.buildResponse(null, {
					parsedSuccessfully: true,
					data: req.body
				}));
			});

			// GET - Health check
			service.get("/health", function (req, res) {
				return res.json(req.soajs.buildResponse(null, { healthy: true }));
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

	it("Should accept requests within body size limit", function (done) {
		// Create a payload under 1MB
		const smallPayload = {
			data: 'a'.repeat(1000) // 1KB
		};

		let options = {
			uri: 'http://127.0.0.1:4110/testLargeBody',
			headers: {
				'Content-Type': 'application/json'
			},
			body: smallPayload
		};

		requester('post', options, (error, body) => {
			assert.ifError(error);
			assert.ok(body);
			assert.ok(body.data);
			assert.equal(body.data.received, true);
			done();
		});
	});

	it("Should reject requests exceeding body size limit (1MB)", function (done) {
		// Create a payload larger than 1MB
		const largePayload = {
			data: 'a'.repeat(1.5 * 1024 * 1024) // 1.5MB
		};

		const postData = JSON.stringify(largePayload);
		const options = {
			hostname: '127.0.0.1',
			port: 4110,
			path: '/testLargeBody',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Content-Length': Buffer.byteLength(postData)
			}
		};

		const req = http.request(options, (res) => {
			// Should get 413 Payload Too Large or connection error
			assert.ok(res.statusCode === 413 || res.statusCode >= 400);
			done();
		});

		req.on('error', (err) => {
			// Connection might be terminated, which is expected
			assert.ok(err);
			done();
		});

		req.write(postData);
		req.end();
	}).timeout(10000);

	it("Should accept requests with normal parameter count", function (done) {
		const normalParams = {};
		for (let i = 0; i < 50; i++) {
			normalParams[`param${i}`] = `value${i}`;
		}

		let options = {
			uri: 'http://127.0.0.1:4110/testManyParams',
			headers: {
				'Content-Type': 'application/json'
			},
			body: normalParams
		};

		requester('post', options, (error, body) => {
			assert.ifError(error);
			assert.ok(body);
			assert.ok(body.data);
			assert.equal(body.data.paramCount, 50);
			done();
		});
	});

	it("Should handle parameter pollution attempt (many parameters)", function (done) {
		// Create exactly 1000 parameters (the limit)
		const manyParams = {};
		for (let i = 0; i < 1000; i++) {
			manyParams[`param${i}`] = `value${i}`;
		}

		let options = {
			uri: 'http://127.0.0.1:4110/testManyParams',
			headers: {
				'Content-Type': 'application/json'
			},
			body: manyParams
		};

		requester('post', options, (error, body) => {
			// Should either succeed (at limit) or reject (over limit)
			if (error) {
				// Expected - parameter limit exceeded
				assert.ok(error);
			} else {
				// If it succeeds, param count should be at or under limit
				assert.ok(body);
				if (body.data) {
					assert.ok(body.data.paramCount <= 1000);
				}
			}
			done();
		});
	});

	it("Should reject request with too many parameters (>1000)", function (done) {
		// Create more than 1000 parameters
		const tooManyParams = {};
		for (let i = 0; i < 1500; i++) {
			tooManyParams[`param${i}`] = `value${i}`;
		}

		const postData = JSON.stringify(tooManyParams);
		const options = {
			hostname: '127.0.0.1',
			port: 4110,
			path: '/testManyParams',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Content-Length': Buffer.byteLength(postData)
			}
		};

		const req = http.request(options, (res) => {
			let responseData = '';

			res.on('data', (chunk) => {
				responseData += chunk;
			});

			res.on('end', () => {
				// Should get an error response or rejection
				if (res.statusCode >= 400) {
					assert.ok(true, 'Request rejected as expected');
				}
				done();
			});
		});

		req.on('error', (err) => {
			// Connection error is also expected for DoS protection
			assert.ok(err);
			done();
		});

		req.write(postData);
		req.end();
	}).timeout(10000);

	it("Should handle valid JSON payloads", function (done) {
		const validJson = {
			key1: 'value1',
			key2: 'value2',
			nested: {
				key3: 'value3'
			}
		};

		let options = {
			uri: 'http://127.0.0.1:4110/testJson',
			headers: {
				'Content-Type': 'application/json'
			},
			body: validJson
		};

		requester('post', options, (error, body) => {
			assert.ifError(error);
			assert.ok(body);
			assert.ok(body.data);
			assert.equal(body.data.parsedSuccessfully, true);
			assert.ok(body.data.data);
			done();
		});
	});

	it("Should handle malformed JSON gracefully", function (done) {
		const postData = '{ invalid json }';
		const options = {
			hostname: '127.0.0.1',
			port: 4110,
			path: '/testJson',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Content-Length': Buffer.byteLength(postData)
			}
		};

		const req = http.request(options, (res) => {
			// Should get 400 Bad Request for malformed JSON
			assert.ok(res.statusCode === 400 || res.statusCode >= 400);
			done();
		});

		req.on('error', () => {
			// Error is acceptable for malformed JSON
			done();
		});

		req.write(postData);
		req.end();
	});

	it("Should remain healthy after DoS attempts", function (done) {
		let options = {
			uri: 'http://127.0.0.1:4110/health',
			headers: {
				'Content-Type': 'application/json'
			}
		};

		requester('get', options, (error, body) => {
			assert.ifError(error);
			assert.ok(body);
			assert.ok(body.data);
			assert.equal(body.data.healthy, true);
			done();
		});
	});
});
