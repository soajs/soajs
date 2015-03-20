"use strict";

var assert = require('assert');
var helper = require("../helper.js");
var coreError = helper.requireModule('./modules/soajs.core/error/index');

describe("core error tests", function() {

	it("success - generate error ", function(done) {
		var error = coreError.generate(100);
		assert.ok(error);
		assert.ok(error.code);
		assert.equal(error.code, 100);
		assert.ok(error.message);
		assert.equal(error.message, "The provided key does not have the right number of characters.");
		done();
	});

	it("success - generate error 2", function(done) {
		var error = coreError.generate(900);
		assert.ok(error);
		assert.ok(error.code);
		assert.equal(error.code, 900);
		assert.equal(error.message, undefined); // no error code 900 in core error config array
		done();
	});

	it("success - get error ", function(done) {
		var errObj = coreError.getError(100);
		assert.ok(errObj);
		assert.ok(errObj.code);
		assert.equal(errObj.code,100);
		assert.ok(errObj.msg);
		assert.equal(errObj.msg,"The provided key does not have the right number of characters.");
		done();
	});

});
