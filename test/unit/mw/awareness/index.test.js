"use strict";
var assert = require("assert");
var helper = require("../../../helper.js");

var index = helper.requireModule('./mw/awareness/index.js');

describe("Testing Enhancer index", function () {
	
	// will be updated in the first it
	var req = {
		headers : {
			referer : 'valueSetInReferer'
		}
	};
	var res = {};
	
	it("test xxxx", function (done) {
		
		process.env.SOAJS_DEPLOY_HA = true;
		process.env.SOAJS_ENV = "dashboard";
		
		var coreModules = require ("soajs.core.modules");
		var core = coreModules.core;
		core.registry.reload();
		
		var param = {
			awareness : true
		};
		
		var functionMw = index(param);
		functionMw(req, res, function () {
			assert.ok(true); // mw next function called
			done();
		});
	});
	
	
});