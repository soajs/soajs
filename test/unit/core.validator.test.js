"use strict";
var assert = require('assert');
var fs = require("fs");
var helper = require("../helper.js");

var coreValidator = helper.requireModule('./modules/soajs.core/index');
var validator = coreValidator.validator;

describe("testing validator", function() {

	it("testing schema patterns", function(done) {
		assert.ok(validator.SchemaPatterns.email);
		done();
	});

});