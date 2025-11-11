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

describe("Daemon integration tests", function () {
	
	let config = require('./config.js');
	
	let daemon = new soajs.server.daemon({"config": config});
	
	before(function (done) {
		daemon.init(function () {
			daemon.job("hello", function (soajs, next) {
				soajs.log.info("HELLO daemon");
				next();
			});
			daemon.start(function (err) {
				assert.ifError(err);
				setTimeout(function () {
					done();
				}, 500);
			});
		});
	});
	after(function (done) {
		daemon.stop(function (err) {
			assert.ifError(err);
			done();
		});
	});
	
	
	it('Testing /helloDaemon/heartbeat', function(done) {
		requester('get', {
			uri: 'http://localhost:5201/heartbeat'
		}, function(err, body) {
			assert.ifError(err);
			assert.deepEqual(body.result, true);
			delete body.ts;
			assert.deepEqual(body, {
				"result": true,
				"service": {"service": "HELLODAEMON", "type": "daemon", "route": "/heartbeat"}
			});
			done();
		});
	});
	
	it('Testing /helloDaemon/daemonStats', function(done) {
		requester('get', {
			uri: 'http://localhost:5201/daemonStats'
		}, function(err, body) {
			assert.ifError(err);
			assert.ok(body);
			assert.deepEqual(body.result, true);
			done();
		});
	});
	
	it('Testing /helloDaemon/reloadDaemonConf', function(done) {
		requester('get', {
			uri: 'http://localhost:5201/reloadDaemonConf'
		}, function(err, body) {
			assert.ifError(err);
			assert.ok(body);
			assert.deepEqual(body.result, true);
			done();
		});
	});
	
	it('Testing /helloDaemon/loadProvision', function(done) {
		requester('get', {
			uri: 'http://localhost:5201/loadProvision'
		}, function(err, body) {
			assert.ifError(err);
			assert.ok(body);
			assert.deepEqual(body.result, true);
			done();
		});
	});
	
});