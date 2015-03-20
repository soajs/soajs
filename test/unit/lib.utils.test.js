"use strict";
var assert = require('assert');
var fs = require("fs");
var helper = require("../helper.js");

var utils = helper.requireModule('./lib/utils');

describe("testing utils", function(){

	describe("testing cloneObj", function(){

		var obj1 = {
			'ts' : new Date(),
			'reg' : /[a-z]+/,
			'arr': ['foo','barr']
		};

		it("testing cloneObj", function(done){
			var obj2 = utils.cloneObj(obj1);
			assert.ok(obj2);
			assert.deepEqual(obj2, obj1);
			done();
		});
	});
});