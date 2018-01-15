"use strict";
var assert = require("assert");
var _ = require("lodash");
var helper = require("../helper.js");

var async = require("async");

var soajs = helper.requireModule('index.js');

var serviceName = "example01";
var serviceName2 = "example06";

var requester = helper.requester;

var scenarios = [];

scenarios.push({
	m: 'get',
	u: '/ping',
	im: {
		"_apiInfo": {
			"l": "ping user get"
		},
		"user": {
			"source": ['query.user'],
			"required": true,
			"validation": {
				"type": "string"
			}
		}
	},
	tests: [
		{u: '/ping?user=john', r: {result: true, data: {user: 'john'}}},
		{u: '/ping', r: {"result": false, "errors": {"codes": [172], "details": [{"code": 172, "message": "Missing required field: user"}]}}},
		{u: '/ping?user=john&email=john@test.com', r: {result: true, data: {user: 'john'}}}
	]
});

scenarios.push({
	m: 'post',
	u: '/pingPost',
	im: {
		"_apiInfo": {
			"l": "ping user post"
		},
		"user": {
			"source": ['body.user'],
			"required": true,
			"validation": {
				"type": "string"
			}
		}
	},
	tests: [
		{u: '/pingPost', p: {user: 'john'}, r: {result: true, data: {user: 'john'}}},
		{u: '/pingPost', p: {}, r: {"result": false, "errors": {"codes": [172], "details": [{"code": 172, "message": "Missing required field: user"}]}}},
		{u: '/pingPost', p: null, r: {"result": false, "errors": {"codes": [172], "details": [{"code": 172, "message": "Missing required field: user"}]}}},
		{u: '/pingPost', p: {user: 'johnx', email: 'john@test.com'}, r: {result: true, data: {user: 'johnx'}}}
	]
});

scenarios.push({
	m: 'post',
	u: '/pingPostPath/:path',
	im: {
		"_apiInfo": {
			"l": "ping user post path"
		},
		"user": {
			"source": ['body.user'],
			"required": true,
			"validation": {
				"type": "string"
			}
		},
		"path": {
			"source": ['params.path'],
			"required": true,
			"validation": {
				"type": "string"
			}
		}
	},
	tests: [
		{u: '/pingPostPath', p: {user: 'john'}, r: {"result": false, "errors": {"codes": [151], "details": [{"code": 151, "message": "You are trying to reach an unknown rest service!"}]}}},
		{u: '/pingPostPath/p1', p: {user: 'john'}, r: {result: true, data: {user: 'john', path: "p1"}}},
		{u: '/pingPostPath/p1', p: {}, r: {"result": false, "errors": {"codes": [172], "details": [{"code": 172, "message": "Missing required field: user"}]}}},
		{u: '/pingPostPath/p1', p: null, r: {"result": false, "errors": {"codes": [172], "details": [{"code": 172, "message": "Missing required field: user"}]}}},
		{u: '/pingPostPath/p1', p: {user: 'johnx', email: 'john@test.com'}, r: {result: true, data: {user: 'johnx', path: "p1"}}}
	]
});

scenarios.push({
	m: 'get',
	u: '/echo/:xxx/name',
	im: {
		"_apiInfo": {
			"l": "echo"
		},
		"xxx": {
			"source": ['params.xxx'],
			"required": true,
			"validation": {
				"type": "string"
			}
		},
		"yyy": {
			"source": ['query.xxx'],
			"required": false,
			"validation": {
				"type": "string"
			}
		}
	},
	tests: [
		{u: '/echo/john/name', r: {result: true, data: {xxx: 'john'}}},
		{u: '/echo/john smith/name', r: {result: true, data: {xxx: 'john smith'}}},
		{u: '/echo/john%20smith/name', r: {result: true, data: {xxx: 'john smith'}}},
		{u: '/echo/john/name?xxx=smith', r: {result: true, data: {xxx: 'john', yyy: 'smith'}}},
		{u: '/echo/0/name', r: {result: true, data: {xxx: '0'}}},
		{u: '/echo/ /name', r: {result: true, data: {xxx: ' '}}},
		{u: '/echo/%20/name', r: {result: true, data: {xxx: ' '}}},
		{u: '/echo//name', r: {"result": false, "errors": {"codes": [151], "details": [{"code": 151, "message": "You are trying to reach an unknown rest service!"}]}}}
	]
});

scenarios.push({
	m: 'post',
	u: '/pingPostObject',
	im: {
		"_apiInfo": {
			"l": "ping post object"
		},
		"name": {
			"source": ['body.user.name'],
			"required": true,
			"validation": {
				"type": "string"
			}
		}
	},
	tests: [
		{u: '/pingPostObject', p: {user: {name: 'john'}}, r: {result: true, data: {name: 'john'}}},
		{
			only: true,
			u: '/pingPostObject',
			p: {user: {name: [1]}},
			r: {"result": false, "errors": {"codes": [173], "details": [{"code": 173, "message": "Validation failed for field: name -> The parameter 'name' failed due to: instance is not of a type(s) string"}]}}
		},
		{u: '/pingPostObject', p: {}, r: {"result": false, "errors": {"codes": [172], "details": [{"code": 172, "message": "Missing required field: name"}]}}},
	]
});

scenarios.push({
	m: 'put',
	u: '/pingPut',
	im: {
		"_apiInfo": {
			"l": "ping put"
		},
		"user": {
			"source": ['query.user'],
			"required": true,
			"validation": {
				"type": "string"
			}
		},
		"title": {
			"source": ['body.title'],
			"validation": {
				"type": "string"
			}
		}
	},
	tests: [
		{u: '/pingPut?user=john', r: {result: true, data: {user: 'john'}}},
		{u: '/pingPut?user=john', p: {title: "Dr."}, r: {result: true, data: {user: 'john', title: "Dr."}}},
		{u: '/pingPut', r: {"result": false, "errors": {"codes": [172], "details": [{"code": 172, "message": "Missing required field: user"}]}}},
		{u: '/pingPut?user=john&email=john@test.com', r: {result: true, data: {user: 'john'}}}
	]
});

scenarios.push({
	m: 'delete',
	u: '/pingDelete',
	im: {
		"_apiInfo": {
			"l": "ping del"
		},
		"user": {
			"source": ['query.user'],
			"required": true,
			"validation": {
				"type": "string"
			}
		},
		"title": {
			"source": ['body.title'],
			"validation": {
				"type": "string"
			}
		}
	},
	tests: [
		{u: '/pingDelete?user=john', r: {result: true, data: {user: 'john'}}},
		{desc: "body should be ignored with DELETE Verb", u: '/pingDelete?user=john', p: {title: "Dr."}, r: {result: true, data: {user: 'john'}}},
		{u: '/pingDelete', r: {"result": false, "errors": {"codes": [172], "details": [{"code": 172, "message": "Missing required field: user"}]}}},
		{u: '/pingDelete?user=john&email=john@test.com', r: {result: true, data: {user: 'john'}}}
	]
});

scenarios.push({
	m: 'post',
	u: '/pingPostValidation',
	im: {
		"_apiInfo": {
			"l": "ping post validation"
		},
		"bodyUser": {
			"source": ['body.user'],
			"required": true,
			"validation": {
				"type": "string"
			}
		},
		"bodyAge": {
			"source": ['body.age'],
			"required": true,
			"validation": {
				"type": "number"
			}
		},
		"bodyIsAdmin": {
			"source": ['body.isAdmin'],
			"required": true,
			"validation": {
				"type": "boolean"
			}
		}
	},
	tests: [
		{u: '/pingPostValidation', p: {user: 'john', isAdmin: true, age: 32}, r: {result: true, data: {bodyUser: 'john', bodyIsAdmin: true, bodyAge: 32}}},
		{u: '/pingPostValidation', p: {user: 'john', isAdmin: false, age: 0}, r: {result: true, data: {bodyUser: 'john', bodyIsAdmin: false, bodyAge: 0}}}
	]
});

scenarios.push({
	m: 'get',
	u: '/pingGetValidation',
	im: {
		"_apiInfo": {
			"l": "ping get validation"
		},
		"bodyUser": {
			"source": ['query.user'],
			"required": true,
			"validation": {
				"type": "string"
			}
		},
		"bodyAge": {
			"source": ['query.age'],
			"required": true,
			"validation": {
				"type": "number"
			}
		},
		"bodyIsAdmin": {
			"source": ['query.isAdmin'],
			"required": true,
			"validation": {
				"type": "boolean"
			}
		}
	},
	tests: [
		{
			//skip: true,
			desc: "Issue #11: QueryString variable does not support validation/formatting for non-string types",
			u: '/pingGetValidation?user=john&isAdmin=true&age=32',
			r: {result: true, data: {bodyUser: 'john', bodyIsAdmin: true, bodyAge: 32}}
		}
	]
});

scenarios.push({
	m: 'post',
	u: '/pingPostValidation2',
	im: {
		"_apiInfo": {
			"l": "ping post validation2"
		},
		"bodyUser": {
			"source": ['body.user'],
			"required": true,
			"validation": {
				"type": "string"
			}
		},
		"bodyAge": {
			"source": ['body.age'],
			"required": true,
			"validation": {
				"type": "number"
			}
		},
		"bodyIsAdmin": {
			"source": ['body.isAdmin'],
			"required": true,
			"validation": {
				"type": "boolean"
			}
		},
		"bodyFavorites": {
			"source": ['body.favorites'],
			"required": false,
			"validation": {
				"type": "array",
				"items": {
					"type": "number"
				}
			}
		},
		"bodyName": {
			"source": ['body.name'],
			"required": false,
			"validation": {
				"type": "object",
				"properties": {
					"first": {
						"type": "string"
					},
					"last": {
						"type": "string"
					}

				}
			}
		},
		"points": {
			"source": ['body.points'],
			"required": false,
			"validation": {
				"type": "integer"
			}
		},
		"a": {
			"source": ['body.a'],
			"required": false,
			"validation": {}
		},
		"patt": {
			"source": ['body.patt'],
			"required": false,
			"validation": {
				'type': 'regexp'
			}
		},
		'c': {"source": ['body.c'], 'validation': {'type': 'object', 'properties': {'c': {'type': 'object', 'properties': {'a': {'type': 'string'}}}}}},
		'd': {"source": ['body.d'], 'validation': {'type': 'array', 'items': {'type': 'array', 'items': {'type': 'string'}}}},
		'e': {"source": ['body.e'], 'validation': {'type': 'array', 'items': {'type': 'object', 'addtionalProperties': {'type': 'string'}}}},
		'f': {
			'source': ['body.f'],
			'validation': {
				'type': 'object',
				"patternProperties": {
					"^[a-z]+$": { //pattern to match an api route
						"type": "object",
						"properties": {
							"access": {'type': 'array', items: {'type': 'string'}}
						},
						"additionalProperties": false
					}
				}
			}
		}
	},
	tests: [
		{
			u: '/pingPostValidation2',
			p: {user: 'john', isAdmin: true, age: 32},
			r: {result: true, data: {bodyUser: 'john', bodyIsAdmin: true, bodyAge: 32}}
		},
		{
			desc: "Body variables sent as JSON success in array case",
			u: '/pingPostValidation2',
			p: {user: 'john', isAdmin: false, age: 0, favorites: [10, 200]},
			r: {result: true, data: {bodyUser: 'john', bodyIsAdmin: false, bodyAge: 0, bodyFavorites: [10, 200]}}
		},
		{
			desc: "Body variables sent as JSON success in object case",
			u: '/pingPostValidation2',
			p: {user: 'john', isAdmin: false, age: 10, name: {first: "john", last: "smith"}},
			r: {result: true, data: {bodyUser: 'john', bodyIsAdmin: false, bodyAge: 10, bodyName: {first: "john", last: "smith"}}}
		},
		{
			desc: "Issue #12: Body variables sent as urlencoded-form-input",
			u: '/pingPostValidation2',
			pf: {
				user: 'john',
				isAdmin: true,
				age: 32,
				points: 120,
				'a': 'b',
				'patt': '^[a-z]+$',
				'c': {'c': {'a': 'b'}},
				'd': [['a', 'b'], ['c', 'd']],
				'e': [{'a': 'b'}],
				'f': {'abc': {'access': ['admin', 'vip']}}
			},
			r: {
				result: true,
				data: {
					bodyUser: 'john',
					bodyIsAdmin: true,
					bodyAge: 32,
					points: 120,
					'a': 'b',
					'patt': {},
					'c': {'c': {'a': 'b'}},
					'd': [['a', 'b'], ['c', 'd']],
					'e': [{'a': 'b'}],
					'f': {'abc': {'access': ['admin', 'vip']}}
				}
			}
		},
		{
			//skip: true,
			desc: "Body variables sent as urlencoded-form-input success in array case",
			u: '/pingPostValidation2',
			pf: {user: 'john', isAdmin: false, age: 0, favorites: [10, 200]},
			r: {result: true, data: {bodyUser: 'john', bodyIsAdmin: false, bodyAge: 0, bodyFavorites: [10, 200]}}
		},
		{
			//skip: true,
			desc: "Body variables sent as urlencoded-form-input success in object case",
			u: '/pingPostValidation2',
			pf: {user: 'john', isAdmin: false, age: 10, name: {first: "john", last: "smith"}},
			r: {result: true, data: {bodyUser: 'john', bodyIsAdmin: false, bodyAge: 10, bodyName: {first: "john", last: "smith"}}}
		}]
});

var holder = {
	controller: null,
	service: null,
	service2: null
};
var lib = {
	startController: function(cb) {
        console.log("**** start controller");
		holder.controller = new soajs.server.controller();
		holder.controller.init(function() {
            console.log("**** start controller init");
			holder.controller.start(cb);
		});
	},
	stopController: function(cb) {
        console.log("**** stop controller");
		holder.controller.stop(cb);
	},

	stopTestService: function(cb) {
        console.log("**** stop service");
		holder.service.stop(cb);
	},
	startTestService: function(cb) {
        console.log("**** start service");
		var config = {
			"serviceName": serviceName,
			"servicePort": 4010,
			"errors": {},
			"schema": {}
		};

		_.forEach(scenarios, function(scenario) {
			config.schema[scenario.u] = scenario.im;
		});

		holder.service = new soajs.server.service({
			//"serviceName": serviceName,
			"bodyParser": true,
			"methodOverride": true,
			"cookieParser": true,
			"logger": true,
			"inputmask": true,
			"session": false,
			"security": false,
			"multitenant": false,
			"acl": false,
			"config": config
		});

		holder.service.init(function() {
            console.log("**** start service init");
			_.forEach(scenarios, function(scenario) {
				holder.service[scenario.m](scenario.u, function(req, res) {
					req.soajs.log.info('Test:' + scenario.u + ' ' + scenario.m);
					var data = {};
					_.forEach(scenario.im, function(info, input) {
						data[input] = req.soajs.inputmaskData[input];
					});
					res.json(req.soajs.buildResponse(null, data));
				});
			});
			holder.service.start(function() {
				//setTimeout(function() {
                //    console.log("**** start service finished waiting for awareness");
					cb();
				//}, 500);
			});
		});
	},

	stopTestService2: function(cb) {
		console.log("**** stop service2");
		holder.service2.stop(cb);
	},
	startTestService2: function(cb) {
		console.log("**** start service2");
		var config = {
			"serviceName": serviceName2,
			"servicePort": 4018,
			"requestTimeout": 30,
			"requestTimeoutRenewal": 5,
			"extKeyRequired": true,
			"awareness": true,
			"errors": {},
			"schema": {
				"/testRoute":{
					"_apiInfo":{
						"l": "Test Route IMFV per Tenant",
						"group": "wow",
						"groupMain": true
					},
					"name": {
						"required": true,
						"source": ['body.name'],
						"validation":{
							"type": "string"
						}
					}
				}
			}
		};

		holder.service2 = new soajs.server.service({
			"session": true,
			"security": true,
			"multitenant": true,
			"acl": true,
			"config": config
		});

		holder.service2.init(function() {
			console.log("**** start service2 init");
			holder.service2.post("/testRoute", function(req, res) {
				req.soajs.log.info('Test: /testRoute POST');
				var data = req.soajs.inputmaskData;
				res.json(req.soajs.buildResponse(null, data));
			});
			holder.service2.start(function() {
				cb();
			});
		});
	}
};

describe('testing inputMask', function() {

	before(function(done) {
		//async.series([lib.startTestService2, lib.startTestService, lib.startController], function(err) {
		async.series([lib.startController, lib.startTestService2, lib.startTestService], function(err) {
			//lib.startTestService(function(err) {
			// console.log(err);
			assert.ifError(err);
			setTimeout(function() {
			done();
			}, 500);
		});
	});
	after(function(done) {
		async.series([lib.stopController, lib.stopTestService, lib.stopTestService2], function(err) {
			//lib.stopTestService(function(err) {
			// console.log(err);
			assert.ifError(err);
			done();
		});
	});
	var runC = 0;
	_.forEach(scenarios, function(scenario, index) {
		describe('Testing InputMask: ' + scenario.m + ' http://localhost:4000/' + serviceName, function() {
			_.forEach(scenario.tests, function(test) {
				var testDescription = 'Testing ' + scenario.m + ' /' + serviceName + test.u;
				if(test.p !== undefined) testDescription += ' post:' + JSON.stringify(test.p);
				if(test.desc !== undefined) testDescription += ' desc:' + JSON.stringify(test.desc);
				if(test.skip) {
					it.skip(testDescription, function(done) {
						done();
					});
				}
				else if(test.only) {
					it(testDescription, function(done) {
						requester(((scenario.m === 'delete') ? 'del' : scenario.m), {
							uri: 'http://localhost:4000/' + serviceName + test.u,
							body: test.p,
							form: test.pf
						}, function(err, body) {
							assert.ifError(err);
							assert.deepEqual(body, test.r);
							done();
						});
					});
				} else {
					it(testDescription, function(done) {
						requester(((scenario.m === 'delete') ? 'del' : scenario.m), {
							uri: 'http://localhost:4000/' + serviceName + test.u,
							body: test.p,
							form: test.pf
						}, function(err, body) {
							assert.ifError(err);
							assert.deepEqual(body, test.r);
							done();
						});
					});
				}
			});
		});
	});

	describe("testing inputMask Tenant IMFV specific", function(){

		it("fail - missing email", function(done){
			requester("post", {
				uri: 'http://localhost:4000/' + serviceName2 + "/testRoute",
				headers:{
					key: "aa39b5490c4a4ed0e56d7ec1232a428f7ad78ebb7347db3fc9875cb10c2bce39bbf8aabacf9e00420afb580b15698c04ce10d659d1972ebc53e76b6bbae0c113bee1e23062800bc830e4c329ca913fefebd1f1222295cf2eb5486224044b4d0c"
				},
				body: true,
				form: { name: 'john'}
			}, function(err, body) {
				assert.ifError(err);
				assert.ok(body);
				// console.log (body);
				assert.equal(body.result, false);
				done();
			});
		});

		it("success - using default type value", function(done){
			requester("post", {
				uri: 'http://localhost:4000/' + serviceName2 + "/testRoute",
				headers:{
					key: "aa39b5490c4a4ed0e56d7ec1232a428f7ad78ebb7347db3fc9875cb10c2bce39bbf8aabacf9e00420afb580b15698c04ce10d659d1972ebc53e76b6bbae0c113bee1e23062800bc830e4c329ca913fefebd1f1222295cf2eb5486224044b4d0c"
				},
				body: true,
				form: { name: 'john', email: "john@soajs.org"}
			}, function(err, body) {
				assert.ifError(err);
				assert.ok(body);
				// console.log (body);
				assert.equal(body.result, true);
				assert.deepEqual(body.data, {
					name: 'john',
					email: "john@soajs.org",
					"type": "userTEST"
				});
				done();
			});
		});

		it("success - full imfv per tenant", function(done){
			requester("post", {
				uri: 'http://localhost:4000/' + serviceName2 + "/testRoute",
				headers:{
					key: "aa39b5490c4a4ed0e56d7ec1232a428f7ad78ebb7347db3fc9875cb10c2bce39bbf8aabacf9e00420afb580b15698c04ce10d659d1972ebc53e76b6bbae0c113bee1e23062800bc830e4c329ca913fefebd1f1222295cf2eb5486224044b4d0c"
				},
				body: true,
				form: { name: 'john', email: "john@soajs.org", type: "overrideTEST"}
			}, function(err, body) {
				assert.ifError(err);
				assert.ok(body);
				assert.equal(body.result, true);
				assert.deepEqual(body.data, {
					name: 'john',
					email: "john@soajs.org",
					"type": "overrideTEST"
				});
				done();
			});
		});
	});
});