"use strict";

var assert = require('assert');
var helper = require("../helper.js");
var coreProvision = helper.requireModule('./modules/soajs.core/provision/index');

describe("core provision tests", function() {

	var metaData = {
		"name": "core_provision",
		"prefix": '',
		"servers": [
			{
				"host": "127.0.0.1",
				"port": 27017
			}
		],
		"credentials": null,
		"URLParam": {
			"connectTimeoutMS": 0,
			"socketTimeoutMS": 0,
			"maxPoolSize": 5,
			"wtimeoutMS": 0,
			"slaveOk": true
		},
		"extraParam": {
			"db": {
				"native_parser": true
			},
			"server": {
				"auto_reconnect": true
			}
		}
	};

	describe("getOAuthToken", function() {
		it("fail - no params", function(done) {
			coreProvision.init(metaData);
			coreProvision.getOauthToken("", function(error, response) {
				assert.ifError(error);
				assert.ok(!response);
				done();
			});
		});

		it("fail - wrong params", function(done) {
			coreProvision.init(metaData);
			coreProvision.getOauthToken("abcd", function(error, response) {
				assert.ifError(error);
				assert.ok(!response);
				done();
			});
		});

		it("success - correct params", function(done) {
			coreProvision.init(metaData);
			coreProvision.getOauthToken("60cf8406626ac96261b47a9126f76241e8384629", function(error, response) {
				assert.ifError(error);
				assert.ok(!response);
				done();
			});
		});
	});

	describe("getPackages", function() {
		it("success - returns packages", function(done) {
			coreProvision.init(metaData);
			coreProvision.getPackages(function(error, packages) {
				assert.ifError(error);
				assert.ok(packages);
				var packageCodes = Object.keys(packages);
				assert.ok(packageCodes.length > 0);
				done();
			});
		});
	});

	describe("getKeysOAuths", function() {
		it("success - returns keys", function(done) {
			coreProvision.init(metaData);
			coreProvision.getKeysOauths(function(error, keys) {
				assert.ifError(error);
				assert.ok(keys);
				assert.ok(keys.keyData);
				assert.ok(keys.oauthData);
				done();
			});
		});
	});

	describe("getKeys", function() {
		it("success - returns keys", function(done) {
			coreProvision.init(metaData);
			coreProvision.getKeys(function(error, keys) {
				assert.ifError(error);
				assert.ok(keys);
				//console.log(keys);
				done();
			});
		});
	});

	describe("getKey", function() {
		it("fail - no key provided", function(done) {
			coreProvision.init(metaData);
			coreProvision.getKey(null, function(error, info) {
				assert.ifError(error);
				assert.ok(!info);
				done();
			});
		});

		it("fail - wrong key provided", function(done) {
			coreProvision.init(metaData);
			coreProvision.getKey("abcd", function(error, info) {
				assert.ifError(error);
				assert.ok(!info);
				done();
			});
		});

		it("success - returns key Info", function(done) {
			coreProvision.init(metaData);
			coreProvision.getKey("d1eaaf5fdc35c11119330a8a0273fee9", function(error, info) {
				assert.ifError(error);
				assert.ok(info);
				//console.log(info);
				done();
			});
		});
	});

	describe("getPackage", function() {
		it("fail - no code provided", function(done) {
			coreProvision.init(metaData);
			coreProvision.getPackage(null, function(error, info) {
				assert.ifError(error);
				assert.ok(!info);
				done();
			});
		});

		it("fail - wrong code provided", function(done) {
			coreProvision.init(metaData);
			coreProvision.getPackage("abcd", function(error, info) {
				assert.ifError(error);
				assert.ok(!info);
				done();
			});
		});

		it("success - returns package Info", function(done) {
			coreProvision.init(metaData);
			coreProvision.getPackage("TPROD_BASIC", function(error, info) {
				assert.ifError(error);
				assert.ok(info);
				//console.log(info);
				done();
			});
		});
	});

	describe("getTenantKeys", function() {
		it("fail - wrong tId provided", function(done) {
			coreProvision.init(metaData);
			coreProvision.getTenantKeys("10d2cb5fc04ce51e06000010", function(error, info) {
				assert.ifError(error);
				assert.ok(!info);
				done();
			});
		});

		it("success - returns tId Keys", function(done) {
			coreProvision.init(metaData);
			coreProvision.getTenantKeys("10d2cb5fc04ce51e06000001", function(error, keys) {
				assert.ifError(error);
				assert.ok(keys);
				//console.log(keys);
				done();
			});
		});

		it("success - no tId provided, returns all keys", function(done) {
			coreProvision.init(metaData);
			coreProvision.getTenantKeys(null, function(error, info) {
				assert.ifError(error);
				assert.ok(info);
				//console.log(info);
				done();
			});
		});
	});

});