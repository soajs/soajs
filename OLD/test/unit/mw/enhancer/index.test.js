"use strict";
var assert = require("assert");
var helper = require("../../../helper.js");

var index = helper.requireModule('./mw/enhancer/index.js');

describe("Testing Enhancer index", function () {
	
	// will be updated in the first it
	var req = {
		headers : {
			referer : 'valueSetInReferer'
		}
	};
	var res = {};
	
	it("test serviceCheck - set req.get", function (done) {
		var functionMw = index({});
		functionMw(req, res, function () {
			assert.ok(true); // mw next function called
			done();
		});
	});
	
	it("test serviceCheck - req.get undefine name", function (done) {
		try {
			req.get();
		} catch (error) {
			assert.deepEqual(error.toString(), 'TypeError: name argument is required to req.get');
			done();
		}
	});
	
	it("test serviceCheck - req.get name as object", function (done) {
		try {
			req.get({});
		} catch (error) {
			assert.deepEqual(error.toString(), 'TypeError: name must be a string to req.get');
			done();
		}
	});
	
	it("test serviceCheck - req.get with a valid name: referer", function (done) {
		var get = req.get("referer");
		assert.deepEqual(get,'valueSetInReferer');
		done();
	});
	
});