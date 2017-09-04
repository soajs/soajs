"use strict";
var assert = require("assert");
var helper = require("../../../helper.js");

var mockedDataRequest = require('./../../mocked-data/request');
var mockedDataStandards = require('./../../mocked-data/standards');
var configuration2 = mockedDataStandards.configuration2;

var serviceIndex = helper.requireModule('./mw/service/index.js');

describe("Testing Service index", function () {
	
	var req = mockedDataRequest.request1;
	var res = {};
	
	it("uracCheck", function (done) {
		var functionMw = serviceIndex(configuration2);
		
		functionMw(req, res, function (error) {
			// assert.equal(error, 153);
			done();
		});
		
	});
	
	
});