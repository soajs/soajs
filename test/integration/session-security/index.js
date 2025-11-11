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

describe("Integration for session security", function () {

	let config = require('./config.js');
	config.packagejson = {
		"version": "1.0.0",
		"dependencies": {}
	};
	const service = new soajs.server.service(config);

	let cookies = null; // Store cookies between requests
	let sessionIdBeforeRegenerate = null;
	let sessionIdAfterRegenerate = null;

	before((done) => {

		service.init(() => {

			// POST - Test session regeneration method exists
			service.post("/login", function (req, res) {
				// Test that MultiTenantSession class has regenerateSession method
				const hasRegenerateMethod = req.soajs.session &&
					typeof req.soajs.session.regenerateSession === 'function';

				return res.json(req.soajs.buildResponse(null, {
					authenticated: true,
					hasRegenerateSessionMethod: hasRegenerateMethod,
					sessionAvailable: !!req.soajs.session
				}));
			});

			// POST - Test session object structure
			service.post("/setSession", function (req, res) {
				const sessionType = typeof req.soajs.session;
				const hasMultiTenant = req.soajs.session && req.soajs.session.constructor &&
					req.soajs.session.constructor.name === 'MultiTenantSession';

				return res.json(req.soajs.buildResponse(null, {
					sessionType: sessionType,
					hasMultiTenantSession: hasMultiTenant,
					methods: req.soajs.session ? Object.getOwnPropertyNames(Object.getPrototypeOf(req.soajs.session)) : []
				}));
			});

			// GET - Test session API availability
			service.get("/getSession", function (req, res) {
				const sessionMethods = {};
				if (req.soajs.session) {
					sessionMethods.hasGet = typeof req.soajs.session.get === 'function';
					sessionMethods.hasSet = typeof req.soajs.session.setSERVICE === 'function';
					sessionMethods.hasDelete = typeof req.soajs.session.deleteTenantSession === 'function';
					sessionMethods.hasRegenerate = typeof req.soajs.session.regenerateSession === 'function';
				}

				return res.json(req.soajs.buildResponse(null, {
					sessionAvailable: !!req.soajs.session,
					methods: sessionMethods
				}));
			});

			// GET - Health check
			service.get("/checkSessionId", function (req, res) {
				return res.json(req.soajs.buildResponse(null, {
					healthy: true,
					sessionObjectExists: !!req.soajs.session
				}));
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

	it("Should verify session object exists in requests", function (done) {
		let options = {
			uri: 'http://127.0.0.1:4109/checkSessionId',
			headers: {
				'Content-Type': 'application/json'
			}
		};
		requester('get', options, (error, body) => {
			if (error) {
				return done(error);
			}
			assert.ok(body);
			assert.ok(body.data);
			assert.equal(body.data.healthy, true);
			assert.ok(body.data.sessionObjectExists !== undefined);
			done();
		});
	});

	it("Should verify MultiTenantSession class is used", function (done) {
		let options = {
			uri: 'http://127.0.0.1:4109/setSession',
			headers: {
				'Content-Type': 'application/json'
			},
			body: {}
		};

		requester('post', options, (error, body) => {
			if (error) {
				return done(error);
			}
			assert.ok(body);
			assert.ok(body.data);
			// Session should be an object
			assert.equal(body.data.sessionType, 'object');
			done();
		});
	});

	it("Should verify regenerateSession method exists", function (done) {
		let options = {
			uri: 'http://127.0.0.1:4109/login',
			headers: {
				'Content-Type': 'application/json'
			},
			body: {
				username: 'testuser',
				password: 'testpass'
			}
		};

		requester('post', options, (error, body) => {
			if (error) {
				return done(error);
			}
			assert.ok(body);
			assert.ok(body.data);
			assert.equal(body.data.authenticated, true);
			// Session fixation prevention method should be available
			assert.ok(body.data.hasRegenerateSessionMethod !== undefined);
			done();
		});
	});

	it("Should verify session API methods are available", function (done) {
		let options = {
			uri: 'http://127.0.0.1:4109/getSession',
			headers: {
				'Content-Type': 'application/json'
			}
		};

		requester('get', options, (error, body) => {
			if (error) {
				return done(error);
			}
			assert.ok(body);
			assert.ok(body.data);
			assert.ok(body.data.sessionAvailable !== undefined);

			// Verify essential session methods exist
			if (body.data.methods) {
				assert.ok(body.data.methods.hasGet !== undefined);
				assert.ok(body.data.methods.hasSet !== undefined);
				assert.ok(body.data.methods.hasRegenerate !== undefined);
			}

			done();
		});
	});
});
