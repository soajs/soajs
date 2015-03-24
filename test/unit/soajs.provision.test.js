"use strict";
var assert = require('assert');
var helper = require("../helper.js");
var soajsProvision = helper.requireModule('./modules/soajs.provision');
var ObjectId = require("mongoskin").ObjectID;

var keyConfig = {
    "algorithm": 'aes256',
    "password": 'soajs key lal massa'
};
var key = "d1eaaf5fdc35c11119330a8a0273fee9";
var extKey = "aa39b5490c4a4ed0e56d7ec1232a428f771e8bb83cfcee16de14f735d0f5da587d5968ec4f785e38570902fd24e0b522b46cb171872d1ea038e88328e7d973ff47d9392f72b2d49566209eb88eb60aed8534a965cf30072c39565bd8d72f68ac";
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
var soajsMongo = helper.requireModule('./index.js').mongo;
var mongo = new soajsMongo(metaData);

describe('testing soajs provisioning', function() {
	var internalKey, externalKey;
	soajsProvision.init(metaData);

	describe("testing generateInternalKey", function() {

		it("success - will return data", function(done) {
			soajsProvision.generateInternalKey(function(error, data) {
				assert.ifError(error);
				assert.ok(data);
				internalKey = data;
				done();
			});
		});
	});

	describe("testing generateExternalKey", function() {

		it("fail - no param", function(done) {
			soajsProvision.generateExtKey(null, keyConfig, function(error, data) {
				assert.ok(error);
				assert.ok(!data);
				done();
			});
		});

		it("fail - wrong key", function(done) {
			soajsProvision.generateExtKey("abcd", keyConfig, function(error, data) {
				assert.ok(error);
				assert.ok(!data);
				done();
			});
		});

		it("success - will return data", function(done) {
			soajsProvision.generateExtKey(key, keyConfig, function(error, data) {
				assert.ifError(error);
				assert.ok(data);
				externalKey = data;
				done();
			});
		});
	});

	describe("testing getExternalKeyData", function() {

		it("fail - no param given", function(done) {
			soajsProvision.getExternalKeyData(null, keyConfig, function(error, data) {
				assert.ok(error);
				assert.ok(!data);
				assert.equal(error.code, 200);
				done();
			});
		});

		it("fail - no param given", function(done) {
			soajsProvision.getExternalKeyData("abcd", keyConfig, function(error, data) {
				assert.ok(error);
				assert.ok(!data);
				done();
			});
		});

		it("success - will return data", function(done) {
			soajsProvision.getExternalKeyData(extKey, keyConfig, function(error, data) {
				assert.ifError(error);
				assert.ok(data);
				//console.log(data);
				done();
			});
		});

		it('success - add an expired key', function(done) {
			mongo.findOne('tenants', {}, function(error, response) {
				assert.ifError(error);
				assert.ok(response);
				response.applications.push({
					"product": "TPROD",
					"package": "TPROD_EXAMPLE03",
					"appId": new ObjectId("30d2cb5fc04ce51e06000003"),
					"description": "this is a description for app testing...",
					"_TTL": 2000, // 4 seconds
					"keys": [
						{
							"key": internalKey,
							"extKeys": [
								{
									"expDate": new Date().getTime() - 86400000,
									"extKey": externalKey,
									"device": {},
									"geo": {}
								}
							],
							"config": {
								"urac": {}
							}
						}
					]
				});
				mongo.save('tenants', response, function(error) {
					assert.ifError(error);
					setTimeout(function() {

						soajsProvision.getExternalKeyData(externalKey, keyConfig, function(error, data) {
							//assert.ifError(error);
							//assert.ok(data);
							//console.log(error, data);
							response.applications.pop();
							mongo.save('tenants', response, function(error) {
								assert.ifError(error);
								done();
							});
						});
					}, 3000);
				});

			});
		});
	});

	describe("testing getPackageData", function() {

		it("fail - no param given", function(done) {
			soajsProvision.getPackageData(null, function(error, data) {
				assert.ok(error);
				assert.ok(!data);
				assert.equal(error.code, 201);
				done();
			});
		});

		it("fail - no param given", function(done) {
			soajsProvision.getPackageData("abcd", function(error, data) {
				assert.ifError(error);
				assert.ok(!data);
				done();
			});
		});

		it("success - will return data", function(done) {
			soajsProvision.getPackageData("TPROD_BASIC", function(error, data) {
				assert.ifError(error);
				assert.ok(data);
				//console.log(data);
				done();
			});
		});
	});

	describe("testing getTenantKeys", function() {

		it("fail - no param given", function(done) {
			soajsProvision.getTenantKeys("10d2cb5fc04ce51e06000010", function(error, data) {
				assert.ifError(error);
				assert.ok(!data);
				done();
			});
		});

		it("success - will return data", function(done) {
			soajsProvision.getTenantKeys("10d2cb5fc04ce51e06000001", function(error, data) {
				assert.ifError(error);
				assert.ok(data);
				//console.log(data);
				done();
			});
		});

		it("success - no param given", function(done) {
			soajsProvision.getTenantKeys(null, function(error, data) {
				assert.ifError(error);
				assert.ok(data);
				done();
			});
		});
	});

	describe("getOAuthToken", function() {
		it("fail - no params", function(done) {
			soajsProvision.getOauthToken("", function(error, response) {
				assert.ifError(error);
				assert.ok(!response);
				done();
			});
		});

		it("fail - wrong params", function(done) {
			soajsProvision.getOauthToken("abcd", function(error, response) {
				assert.ifError(error);
				assert.ok(!response);
				done();
			});
		});

		it("success - correct params", function(done) {
			soajsProvision.getOauthToken("60cf8406626ac96261b47a9126f76241e8384629", function(error, response) {
				assert.ifError(error);
				assert.ok(!response);
				done();
			});
		});
	});
});

describe("oauthModel tests", function() {

	describe("getClient tests", function() {
		it("fail - no client id provided", function(done) {
			soajsProvision.oauthModel.getClient(null, null, function(error, response) {
				assert.ok(!error);
				assert.ok(!response);
				done();
			});
		});

		it("success - no secret provided", function(done) {
			soajsProvision.init(metaData);
			soajsProvision.loadProvision(function(loaded) {
				assert.ok(loaded);
				soajsProvision.oauthModel.getClient('10d2cb5fc04ce51e06000001', null, function(error, response) {
					assert.ok(!error);
					assert.ok(response);
					assert.deepEqual(response, {"clientId": "10d2cb5fc04ce51e06000001"});
					done();
				});
			});
		});

		it("success - all provided correctly", function(done) {
			soajsProvision.init(metaData);
			soajsProvision.loadProvision(function(loaded) {
				assert.ok(loaded);
				soajsProvision.oauthModel.getClient('10d2cb5fc04ce51e06000001', "shhh this is a secret", function(error, response) {
					assert.ok(!error);
					assert.ok(response);
					assert.deepEqual(response, {"clientId": "10d2cb5fc04ce51e06000001"});
					done();
				});
			});
		});
	});

	describe("grantTypeAllowed tests", function() {
		before(function(done) {
			soajsProvision.init(metaData);
			soajsProvision.loadProvision(function(loaded) {
				assert.ok(loaded);
				done();
			});
		});

		it("fail - no params provided", function(done) {
			soajsProvision.oauthModel.grantTypeAllowed(null, null, function(error, response) {
				assert.ok(!error);
				assert.ok(!response);
				done();
			});
		});

		it("fail - no grantType provided", function(done) {
			soajsProvision.oauthModel.grantTypeAllowed('10d2cb5fc04ce51e06000001', null, function(error, response) {
				assert.ok(!error);
				assert.ok(!response);
				done();
			});
		});

		it("success - all provided correctly grantType=password", function(done) {
			soajsProvision.oauthModel.grantTypeAllowed('10d2cb5fc04ce51e06000001', "password", function(error, response) {
				assert.ok(!error);
				assert.ok(response);
				done();
			});
		});

		it("success - all provided correctly grantType=refresh_token", function(done) {
			soajsProvision.oauthModel.grantTypeAllowed('10d2cb5fc04ce51e06000001', "refresh_token", function(error, response) {
				assert.ok(!error);
				assert.ok(response);
				done();
			});
		});

	});

	describe("getAccessToken tests", function(){

		it("success tests", function(done){
			soajsProvision.oauthModel.getAccessToken(null, function(err, token){
				assert.ok(!err);
				assert.ok(!token);
				done();
			});
		});
	});

	describe("getRefreshToken tests", function(){

		it("success tests", function(done){
			soajsProvision.oauthModel.getRefreshToken(null, function(err, token){
				assert.ok(!err);
				assert.ok(!token);
				done();
			});
		});
	});

	describe("saveAccessToken tests", function(){

		it("success tests", function(done){
			soajsProvision.oauthModel.saveAccessToken(null, null, null, null, function(err, token){
				assert.ok(!err);
				assert.ok(!token);
				done();
			});
		});
	});

	describe("saveRefreshToken tests", function(){

		it("success tests", function(done){
			soajsProvision.oauthModel.saveRefreshToken(null, null, null, null, function(err, token){
				assert.ok(!err);
				assert.ok(!token);
				done();
			});
		});
	});

	describe("getUser tests", function(){

		it("success tests", function(done){
			soajsProvision.oauthModel.getUser(null, null, function(err, token){
				assert.ok(!err);
				//assert.ok(!token);
				done();
			});
		});
	});


});