"use strict";

var assert = require('assert');
var helper = require("../helper.js");
var coreKey = helper.requireModule('./modules/soajs.core/key/index');

describe("core key tests", function() {
	var internalKey, externalKey;
	describe("generateInternalKey Tests", function() {
		it("success - calling generateInternalKey", function(done) {
			coreKey.generateInternalKey(function(error, uId) {
				assert.ifError(error);
				assert.ok(uId);
				internalKey = uId;
				done();
			});
		});
	});

	describe("generateExternalKey Tests", function() {
		it("fail - calling generateExternalKey with no arguments", function(done) {
			coreKey.generateExternalKey(null, null, null, null, function(error, extId) {
				assert.ok(error);
				assert.ok(!extId);
				done();
			});
		});

		it("fail - calling generateExternalKey with arg 1 only", function(done) {
			coreKey.generateExternalKey(internalKey, null, null, null, function(error, extId) {
				assert.ok(error);
				assert.ok(!extId);
				done();
			});
		});

		it("fail - calling generateExternalKey with arg 1 & 2 only", function(done) {
			coreKey.generateExternalKey(internalKey, {'id': '10d2cb5fc04ce51e06000001'}, null, null, function(error, extId) {
				assert.ok(error);
				assert.ok(!extId);
				done();
			});
		});

		it("success - calling generateExternalKey", function(done) {
			coreKey.generateExternalKey(internalKey, {'id': '10d2cb5fc04ce51e06000001'}, {'package': 'TPROD_BASIC'}, null, function(error, extId) {
				assert.ifError(error);
				assert.ok(extId);
				externalKey = extId;
				done();
			});
		});
	});

	describe("getInfo Tests", function() {
		it("fail - invalid key value provided", function(done) {
			coreKey.getInfo("abcdef", null, function(error, response) {
				assert.ok(error);
				assert.ok(!response);
				done();
			});
		});

		it("success - valid key value provided", function(done) {
			coreKey.getInfo(externalKey, null, function(error, response) {
				assert.ifError(error);
				assert.ok(response);
				console.log(response);
				done();
			});
		});

	});
});
