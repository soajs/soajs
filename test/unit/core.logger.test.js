"use strict";
var assert = require('assert');
var fs = require("fs");
var helper = require("../helper.js");
var core = helper.requireModule('./modules/soajs.core/index');
//var registry = core.getRegistry();
var coreLogger = core.getLogger('testing', {
    "src": true,
    "level": "debug"
});
var methods = ['trace', 'warn', 'fatal', 'error','debug', 'info'];

var dataObj = {
	"code" : "TPROD",
	"name" : "Test Product",
	"description" : "this is a description for test product",
	"packages" : [
		{
			"code" : "TPROD_BASIC",
			"name" : "basic package",
			"description" : "this is a description for test product basic package",
			"acl" : {
				"urac" : {}
			},
			"_TTL" : 86400000 // 24 hours
		},
		{
			"code" : "TPROD_EXAMPLE03",
			"name" : "example03 package",
			"description" : "this is a description for test product example03 package",
			"acl" : {
				"urac" : {},
				"example03" : {}
			},
			"_TTL" : 86400000 // 24 hours
		}
	]
};

describe("core logger tests with logging directory", function() {

	methods.forEach(function(oneMethod) {
		it("testing Logger " + oneMethod, function(done) {

			assert.doesNotThrow(function() { coreLogger[oneMethod](); });
			assert.doesNotThrow(function() { coreLogger[oneMethod](true); });
			assert.doesNotThrow(function() { coreLogger[oneMethod](false); });
			assert.doesNotThrow(function() { coreLogger[oneMethod](new Date()); });
			assert.doesNotThrow(function() { coreLogger[oneMethod]("This is a text ...."); });
			assert.doesNotThrow(function() { coreLogger[oneMethod](1, 'Test', 'text'); });
			assert.doesNotThrow(function() { coreLogger[oneMethod](['a', 'b']); });
			assert.doesNotThrow(function() { coreLogger[oneMethod]([1, 2, 3, 4]); });
			assert.doesNotThrow(function() { coreLogger[oneMethod](undefined); });
			assert.doesNotThrow(function() { coreLogger[oneMethod](null); });
			assert.doesNotThrow(function() { coreLogger[oneMethod](NaN); });
			assert.doesNotThrow(function() { coreLogger[oneMethod](/[a-z]+/); });
			assert.doesNotThrow(function() { coreLogger[oneMethod](dataObj); });
			done();
		});

	});

});