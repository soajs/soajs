"use strict";
var assert = require("assert");
var helper = require("../../../helper.js");

var index = helper.requireModule('./mw/inputmask/index.js');

describe("Testing inputmask index", function () {
	
	it("Invalid config", function (done) {
		var config = {
			"type": "service",
			"prerequisites": {
				"cpu": "",
				"memory": ""
			},
			"bodyParser": true,
			"methodOverride": true,
			"cookieParser": true,
			"logger": true,
			"inputmask": true,
			"awareness": true,
			"awarenessEnv": false,
			"serviceIp": "127.0.0.1",
			"serviceHATask": null,
			"swagger": false,
			"swaggerFilename": "swagger.yml",
			"urac": false,
			"urac_Profile": false,
			"urac_ACL": false,
			"provision_ACL": false
		};
		
		var inputmaskSrc = [
			"params",
			"headers",
			"query",
			"cookies",
			"body"
		];
		
		try {
			index(config, inputmaskSrc);
		} catch (exception) {
			assert.equal(exception.toString(), "Error: Inputmask error: Invalid configuration: instance.serviceName is required,instance.servicePort is required");
			done();
		}
	});
	
	it("No soajs obj in request", function (done) {
		var config = {
			"type": "service",
			"prerequisites": {
				"cpu": "",
				"memory": ""
			},
			"serviceVersion": "1",
			"serviceName": "oauth",
			"serviceGroup": "SOAJS Core Services",
			"servicePort": 4002,
			"requestTimeout": 30,
			"requestTimeoutRenewal": 5,
			"extKeyRequired": true,
			"oauth": true,
			"oauthService": {
				"name": "oauth",
				"tokenApi": "/token",
				"authorizationApi": "/authorization"
			},
			"hashIterations": 1024,
			"seedLength": 32,
			"model": "mongo",
			"loginMode": "oauth",
			"errors": {
				"400": "Problem with the provided password.",
				"401": "Unable to log in the user. User not found.",
				"403": "User does not have access to this tenant",
				"404": "Error executing operation",
				"405": "Invalid Tenant id",
				"406": "Missing Tenant secret",
				"413": "Problem with the provided password.",
				"601": "Model not found"
			},
			"schema": {},
			"bodyParser": true,
			"methodOverride": true,
			"cookieParser": true,
			"logger": true,
			"inputmask": true,
			"awareness": true,
			"awarenessEnv": false,
			"serviceIp": "127.0.0.1",
			"serviceHATask": null,
			"swagger": false,
			"swaggerFilename": "swagger.yml",
			"urac": false,
			"urac_Profile": false,
			"urac_ACL": false,
			"provision_ACL": false
		};
		
		var inputmaskSrc = [
			"params",
			"headers",
			"query",
			"cookies",
			"body"
		];
		
		var inputMaskFunction = index(config, inputmaskSrc);
		
		var req = {}; // missing soajs
		var res = {};
		var next = {};
		
		try {
			inputMaskFunction(req, res, next);
		} catch (exception) {
			done();
		}
	});
	
});