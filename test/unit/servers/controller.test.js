"use strict";
var assert = require("assert");
var helper = require("../../helper.js");

describe("Testing Controller", function () {
	
	var SOAJS_SRVIP;
	var SOAJS_DEPLOY_HA;
	var SOAJS_ENV;
	var SOAJS_SRV_AUTOREGISTERHOST;
	
	// store env variables
	before(function(done) {
		SOAJS_SRVIP = process.env.SOAJS_SRVIP;
		SOAJS_DEPLOY_HA = process.env.SOAJS_DEPLOY_HA;
		SOAJS_ENV = process.env.SOAJS_ENV;
		SOAJS_SRV_AUTOREGISTERHOST = process.env.SOAJS_SRV_AUTOREGISTERHOST;
		done();
	});
	
	// re store env variables
	after(function(done) {
		if(SOAJS_SRVIP){
			process.env.SOAJS_SRVIP = SOAJS_SRVIP;
		}else{
			delete process.env.SOAJS_SRVIP;
		}
		if(SOAJS_DEPLOY_HA){
			process.env.SOAJS_DEPLOY_HA = SOAJS_DEPLOY_HA;
		}else{
			delete process.env.SOAJS_DEPLOY_HA;
		}
		if(SOAJS_ENV){
			process.env.SOAJS_ENV = SOAJS_ENV;
		}else{
			delete process.env.SOAJS_ENV;
		}
		if(SOAJS_SRV_AUTOREGISTERHOST){
			process.env.SOAJS_SRV_AUTOREGISTERHOST = SOAJS_SRV_AUTOREGISTERHOST;
		}else{
			delete process.env.SOAJS_SRV_AUTOREGISTERHOST;
		}
		
		done();
	});
	
	it("init - serviceIp ", function (done) {
		process.env.SOAJS_SRV_AUTOREGISTERHOST = "false";
		process.env.SOAJS_ENV = "dashboard"
		var controller = helper.requireModule('./servers/controller');
		controller = new controller();
		controller.init(function () {
			controller.stop(function () {
				done();
			});
		});
	});
	
	it.skip("init - without serviceIp, with SOAJS_DEPLOY_HA", function (done) {
		
		delete process.env.SOAJS_SRVIP;
		process.env.SOAJS_DEPLOY_HA = false;
		process.env.SOAJS_ENV = "dashboard"
		var controller = helper.requireModule('./servers/controller');
		controller = new controller();
		controller.init(function () {
			controller.stop(function () {
				done();
			});
		});
	});
	
});