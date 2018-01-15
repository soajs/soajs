"use strict";
var assert = require("assert");
var helper = require("../helper.js");
var requester = helper.requester;

var soajs = helper.requireModule('index.js');
var service;

var lib = {
	stopTestService: function (cb) {
		service.stop(cb);
	},
	startTestService: function (cb) {
		var config = {
			"serviceName": "example03",
			"servicePort": 4012,
			"errors": {
				"401": "error logging in try again"
			},
			"schema": {
				"commonFields": {
					"name": {
						"required": true,
						"source": ['body.name'],
						"validation": {"type": "string"}
					}
				},
				"/testRoute": {
					"_apiInfo": {
						"l": "Test Route"
					},
					"commonFields": ['name'],
					"user": {
						"required": true,
						"source": ['body.user'],
						"validation": {"type": "object"}
					},
					"info": {
						"required": true,
						"source": ['body.info'],
						"validation": {"type": "regexp"}
					},
					"age": {
						"required": false,
						"source": ['body.age'],
						"default": 30,
						"validation": {}
					}
				}
			}
		};
		
		service = new soajs.server.service(config);
		
		service.init(function () {
			service.post("/testRoute", function (req, res) {
				res.json(req.soajs.buildResponse(null, req.soajs.inputmaskData));
			});
			
			service.start(function () {
				cb();
			});
		});
	},
	
	startDaemon: function(cb){
		var daemon = new soajs.server.daemon({
			"config": {
				serviceName: "helloDaemon",
				"serviceVersion": 1,
				servicePort: 4200,
				"errors": {},
				"schema": {
					"hello": {
						"l": "hello world"
					}
				}
			}
		});
		
		daemon.init(function() {
			daemon.job("hello", function(soajs, next) {
				soajs.log.info ("HELLO daemon");
				// console.log ("*************************");
				// console.log(soajs.servicesConfig);
				next();
			});
			daemon.start(function(err){
				assert.ifError(err);
				setTimeout(function() {
					cb();
				}, 500);
			});
		});
	}
};

describe("testing maintenance", function(){
	
	before(function(done){
		lib.startTestService(function(){
			setTimeout(function(){
				done();
			}, 2000);
		});
	});
	
	after(function(done){
		lib.stopTestService(done);
	});
	
	describe("maitenance operations", function(){
		
		it("reload Registry", function(done){
			requester('get', {
				uri: 'http://localhost:5012/reloadRegistry'
			}, function(err, body, response) {
				assert.ifError(err);
				assert.equal(response.statusCode, 200);
				assert.ok(body);
				assert.deepEqual(body.result, true);
				done();
			});
		});
		
		it("loading Provision", function(done){
			requester('get', {
				uri: 'http://localhost:5012/loadProvision'
			}, function(err, body, response) {
				assert.ifError(err);
				assert.equal(response.statusCode, 200);
				assert.ok(body);
				assert.deepEqual(body.result, true);
				done();
			});
		});
		
		it("resource Info", function(done){
			requester('get', {
				uri: 'http://localhost:5012/resourceInfo'
			}, function(err, body, response) {
				assert.ifError(err);
				assert.equal(response.statusCode, 200);
				assert.ok(body);
				assert.deepEqual(body.result, true);
				done();
			});
		});
		
		it("heartbeat", function(done){
			requester('get', {
				uri: 'http://localhost:5012/'
			}, function(err, body, response) {
				assert.ifError(err);
				assert.equal(response.statusCode, 200);
				assert.ok(body);
				assert.deepEqual(body.result, true);
				done();
			});
		});
		
		it('Testing /helloDaemon/reloadRegistry', function(done) {
			process.env.SOAJS_TEST = true;
			lib.startDaemon(function(){
				setTimeout(function(){
					requester('get', {
						uri: 'http://localhost:5200/reloadRegistry'
					}, function(err, body, response) {
						assert.ifError(err);
						assert.equal(response.statusCode, 200);
						assert.ok(body);
						assert.deepEqual(body.result, true);
						done();
					});
				}, 1000);
			});
		});
		
		it('Testing /helloDaemon/heartbeat', function(done) {
			requester('get', {
				uri: 'http://localhost:5200/heartbeat'
			}, function(err, body, response) {
				assert.ifError(err);
				assert.equal(response.statusCode, 200);
				delete body.ts;
				assert.deepEqual(body, {
					"result": true,
					"service": {"service": "HELLODAEMON", "type": "daemon", "route": "/heartbeat"}
				});
				done();
			});
		});
		it('Testing /helloDaemon/daemonStats', function(done) {
			requester('get', {
				uri: 'http://localhost:5200/daemonStats'
			}, function(err, body, response) {
				assert.ifError(err);
				assert.equal(response.statusCode, 200);
				assert.ok(body);
				assert.deepEqual(body.result, true);
				done();
			});
		});
	});
});