"use strict";
var assert = require("assert");
var helper = require("../../../helper.js");

describe("Testing awarenessEnv Custom", function () {
	
	let custom;
	
	before(function (done) {
		custom = helper.requireModule('./mw/awarenessEnv/custom.js');
		done();
	});
	
	after(function (done) {
		
		done();
	});
	
	it("test getControllerEnvHost 3 args", function (done) {
		custom.getControllerEnvHost(1, 'dashboard', function (host) {
			done();
		});
	});
	
	it("test getControllerEnvHost 4 args", function (done) {
		custom.getControllerEnvHost('controller', 1, 'dashboard', function (host) {
			// var coreModules = require ("soajs.core.modules");
			// var core = coreModules.core;
			// core.registry.reload();
			done();
		});
	});
	
	
});