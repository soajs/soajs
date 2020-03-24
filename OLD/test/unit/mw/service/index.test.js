"use strict";
var assert = require("assert");
var helper = require("../../../helper.js");

var mockedDataRequest = require('./../../mocked-data/request');
var mockedDataStandards = require('./../../mocked-data/standards');
var configuration2 = mockedDataStandards.configuration2;

var oldEnvSet = process.env.SOAJS_ENV;
delete process.env.SOAJS_ENV;
var serviceIndex = helper.requireModule('./mw/service/index.js');

describe("Testing Service index", function () {
	
	var req = mockedDataRequest.request1;
	var res = {};
	
	it("uracCheck", function (done) {
		var functionMw = serviceIndex(configuration2);
		
		functionMw(req, res, function (error) {
			process.env.SOAJS_ENV = oldEnvSet; // restore env var
			done();
		});
	});
	
	it("persist session", function (done) {
		
		configuration2.param.session = true;
		req.sessionStore = {
			set : function(input1, input2, cb){
				var error = {
					code : 1234,
					message : "erreur"
				};
				return cb(error);
			}
		};
		
		var functionMw = serviceIndex(configuration2);
		
		functionMw(req, res, function (error) {
			done();
		});
	});
	
	it("error 142 - no tenant + extkey set to true", function (done) {
		
		var obj = JSON.parse(req.headers.soajsinjectobj);
		var oldTenant = obj.tenant;
		delete obj.tenant;
		req.headers.soajsinjectobj = JSON.stringify(obj);
		
		var functionMw = serviceIndex(configuration2);
		
		functionMw(req, res, function (error) {
			
			// restore
			var obj = JSON.parse(req.headers.soajsinjectobj);
			obj.tenant = oldTenant;
			req.headers.soajsinjectobj = JSON.stringify(obj);
			
			assert.equal(error, 142);
			done();
		});
	});
	
	
});