"use strict";
var assert = require("assert");
var helper = require("../../../helper.js");

var index = helper.requireModule('./mw/favicon/index.js');

describe("Testing Favicon index", function () {
	it("test favicon", function (done) {
		var functionMw = index();
		var callback = function () {
			assert.ok(true); // mw next function called
			done();
		};
		
		var req = {url: '/favicon.ico'};
		var res = {
			writeHead: function () {
				return 'ok';
			},
			end: function () {
				return callback();
			}
		};
		
		functionMw(req, res, callback);
	});
});