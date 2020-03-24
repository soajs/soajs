"use strict";
var assert = require("assert");
var helper = require("../../../helper.js");

var response = helper.requireModule('./mw/response/response.js');

describe("Testing response", function () {
	
	it("Error code is required", function (done) {
		try{
			response.prototype.addErrorCode();
		}catch(exception){
			assert.equal(exception.toString(),"TypeError: error code is required");
			done();
		}
	});
	
	it("Errors", function (done) {
		response.prototype.errors = {
			codes : [23,22]
		};
		response.prototype.addErrorCode(22, "Big Error");
		delete response.prototype.errors;
		done();
	});
	
	it("Result must be boolean", function (done) {
		try{
			response(22,"non boolean")
		}catch(exception){
			assert.equal(exception.toString(),"TypeError: Result must be boolean");
			done();
		}
	});
});