"use strict";
var assert = require("assert");
var helper = require("../../../helper.js");

var mockedDataRequest = require('./../../mocked-data/request');
var mockedDataStandards = require('./../../mocked-data/standards');
var configuration2 = mockedDataStandards.configuration2;

var serviceIndex = helper.requireModule('./mw/response/index.js');

describe("Testing Service index", function () {
	
	var req = mockedDataRequest.request1;
	var res = {
		writeHead : function(){
			
		},
		end : function(){
			
		}
	};
	
	it("Without soajs", function (done) {
		var functionMw = serviceIndex(configuration2);
		
		functionMw({}, res, function (error) {
			done();
		});
	});
	
	it("Controller response with status", function (done) {
		var functionMw = serviceIndex(configuration2);
		
		functionMw(req, res, function (error) {
			var jsonObj = {
				status : 2
			};
			req.soajs.controllerResponse(jsonObj);
			done();
		});
	});
	
});