"use strict";
var path = require("path");
var shell = require('shelljs');
var assert = require('assert');
var helper = require("../helper.js");
var extKey = 'aa39b5490c4a4ed0e56d7ec1232a428f7ad78ebb7347db3fc9875cb10c2bce39bbf8aabacf9e00420afb580b15698c04ce10d659d1972ebc53e76b6bbae0c113bee1e23062800bc830e4c329ca913fefebd1f1222295cf2eb5486224044b4d0c';

var soajs = helper.requireModule('index.js');
var assert = require('assert');
var helper = require("../helper.js");
var shell = require('shelljs');

describe("Proxy Tests", function () {
	
	let controller;
	
	before(function (done) {
		controller = new soajs.server.controller();
		controller.init(function() {
			console.log("**** start controller init");
			controller.start(done);
		});
	});
	
	after(function (done) {
		controller.stop(done);
	});
	
	it("Get permissions", function (done) {
		var options = {
			uri: 'http://127.0.0.1:4000/key/permission/get',
			headers: {
				'Content-Type': 'application/json',
				key: extKey
			}
		};
		helper.requester('get', options, function (error, body) {
			// assert.ifError(error);
			// assert.ok(body);
			done();
		});
	});
});
