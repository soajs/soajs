"use strict";
var path = require("path");
var shell = require('shelljs');
var assert = require('assert');
var helper = require("../helper.js");
var extKey = '9b96ba56ce934ded56c3f21ac9bdaddc8ba4782b7753cf07576bfabcace8632eba1749ff1187239ef1f56dd74377aa1e5d0a1113de2ed18368af4b808ad245bc7da986e101caddb7b75992b14d6a866db884ea8aee5ab02786886ecf9f25e974';

var soajs = helper.requireModule('index.js');
var assert = require('assert');
var helper = require("../helper.js");
var shell = require('shelljs');
var sampleData = require("soajs.mongodb.data/modules/proxy");
var proxy;

describe("Proxy Tests", function () {
	
	var dashboardController;
	var devController;
	
	before("do import", function (done) {
		shell.pushd(sampleData.dir);
		shell.exec("chmod +x " + sampleData.shell, function (code) {
			assert.equal(code, 0);
			shell.exec(sampleData.shell, function (code) {
				assert.equal(code, 0);
				shell.popd();
				done();
			});
		});
	});
	
	before("Start Main Controller", function (done) {
		dashboardController = new soajs.server.controller();
		dashboardController.init(function() {
			dashboardController.start(done);
		});
	});
	
	after("Stop Main Controller",function(done){
		// devController.stop(function(){
			dashboardController.stop(done);
		// });
	});
	
	
	
	it("fail - Access Forbidden to requested environment (invalid), error 137", function (done) {
		var options = {
			uri: 'http://127.0.0.1:4000/proxy/redirect',
			headers: {
				'Content-Type': 'application/json',
				key: extKey
			},
			"qs": {
				"proxyRoute": encodeURIComponent("/urac/getUser"),
				"__env": "invalid"
			}
		};
		helper.requester('get', options, function (error, body) {
			assert.ifError(error);
			assert.ok(body);
			assert.equal(body.result, false);
			assert.ok(body.errors);
			done();
		});
	});
	
	it.skip("deploy controller and urac in another environment", function (done) {
		var node_modules = path.normalize(__dirname + "/../../../../node_modules/");
		var envs = process.env;
		envs.SOAJS_ENV = "dev";
		envs.SOAJS_SRVIP = "127.0.0.1";
		
		devController = new soajs.server.controller();
		devController.init(function() {
			devController.start(function(){
				assert.equal(code, 0);
			});
		});
		
		setTimeout(function(){
			shell.exec("node " + node_modules + "soajs.urac/index.js", function (code) {
				assert.equal(code, 0);
			});
			
			setTimeout(function(){
				done();
			}, 2000);
			
		}, 1000);
	});
	
	it("Load provision", function(done){
		var options = {
			uri: 'http://127.0.0.1:5000/loadProvision'
		};
		helper.requester('get', options, function (error, body) {
			assert.ifError(error);
			assert.ok(body);
			done();
		});
	});
	
	it.skip("success - will redirect to urac GET protocol", function (done) {
		var options = {
			uri: 'http://127.0.0.1:4000/proxy/redirect',
			headers: {
				'Content-Type': 'application/json',
				key: extKey
			},
			"qs": {
				"proxyRoute": encodeURIComponent("/urac/account/getUser?username=owner"),
				"username": "owner",
				"__env": "dev"
			}
		};
		helper.requester('get', options, function (error, body) {
			assert.ifError(error);
			assert.ok(body);
			// assert.equal(body.result, true);
			// assert.ok(body.data);
			done();
		});
	});
});
