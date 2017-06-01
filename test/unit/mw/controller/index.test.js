"use strict";
var assert = require("assert");
var helper = require("../../../helper.js");

var index = helper.requireModule('./mw/controller/index.js');

describe("Testing Controller index", function () {
	
	var req = {
		headers : {
			
		}
	};
	var res = {};
	
	it("fail - soajs mw is not started", function (done) {
		var functionMw = index();
		
		try{
			functionMw({}, res,null);
		}catch(error){
			assert.deepEqual(error.toString(), 'TypeError: soajs mw is not started');
			done();
		}
	});
	
	// TODO : index !== -1 ....
	
	// it("fail - index !== -1", function (done) {
	// 	var functionMw = index();
	//
	// 	functionMw(req, res, function (error) {
	// 		assert.deepEqual(error.toString(), 'TypeError: soajs mw is not started');
	// 		done();
	// 	});
	// });
	
	
});