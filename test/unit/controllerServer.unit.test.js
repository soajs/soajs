//this is comment

var assert = require("assert");
var async = require("async");
var helper = require("../helper.js");

var requester = helper.requester;

var controllerApp = new (helper.requireModule('./servers/controller.js'));
var soajs = helper.requireModule('index.js');

describe("testing controller", function() {

	before(function(done) {
		var helloworld = new soajs.server.service({
			"config": {
				"serviceName": 'helloworld',
				"serviceVersion": 1,
				"servicePort": 4020,
				"extKeyRequired": false,
				errors: {},
				schema: {
					"/hello": {
						"_apiInfo": {
							"l": "Hello Wolrd"
						},
						"firstName": {
							"source": ['query.firstName'],
							"required": false,
							"validation": {
								"type": "string"
							}
						}

					}
				}
			}
		});
        console.log ("********** controller before");
		helloworld.init(function() {
            console.log ("********** controller before - helloworld.init");
			helloworld.start(function() {
                console.log ("********** controller before - helloworld.start");
				helloworld.stop(function() {
                    console.log ("********** controller before - helloworld.stop");
					controllerApp.init(function() {
                        console.log ("********** controller before - controllerApp.init");
						controllerApp.start(function(err) {
                            console.log ("********** controller before - controllerApp.start");
							assert.ifError(err);

							requester('get', {
								uri: 'http://localhost:5000/reloadRegistry'
							}, function(err, body, response) {
                                console.log ("********** controller before - reloadRegistry");
								assert.ifError(err);
								assert.equal(response.statusCode, 200);
								assert.equal(response.headers['content-type'], 'application/json');
								helloworld.init(function() {
									helloworld.start(function() {
										helloworld.stop(function() {
                                            console.log ("********** controller before - DONE");
											done();
										});
									});
								});
							});
						});
					});
				});
			});
		});
	});

	describe('Testing controllerServer', function() {

		it('Testing /favicon.ico', function(done) {
			requester('get', {
				uri: 'http://localhost:4000/favicon.ico'
			}, function(err, body, response) {
				assert.ifError(err);
				assert.equal(typeof(body), 'undefined');
				assert.equal(response.statusCode, 200);
				assert.equal(response.headers['content-type'], 'image/x-icon');
				done();
			});
		});
		it('Testing /reloadRegistry', function(done) {
			requester('get', {
				uri: 'http://localhost:5000/reloadRegistry'
			}, function(err, body, response) {
				assert.ifError(err);
				assert.equal(response.statusCode, 200);
				assert.equal(response.headers['content-type'], 'application/json');
				done();
			});
		});
		it('Testing /heartbeat', function(done) {
			requester('get', {
				uri: 'http://localhost:5000/heartbeat'
			}, function(err, body, response) {
				assert.ifError(err);
				assert.equal(response.statusCode, 200);
				assert.equal(response.headers['content-type'], 'application/json');
				done();
			});
		});
		it('Testing /unknown', function(done) {
			requester('get', {
				uri: 'http://localhost:5000/unknown'
			}, function(err, body, response) {
				assert.ifError(err);
				assert.equal(response.statusCode, 200);
				assert.equal(body.result, true);
				done();
			});
		});
		it('Testing /example01 w/o starting service', function(done) {
			requester('get', {
				uri: 'http://localhost:4000/example01'
			}, function(err, body, response) {
				assert.ifError(err);
				assert.equal(response.statusCode, 200);
				// console.log(JSON.stringify(body, null, 2));
				assert.deepEqual(body, {
					"result": false,
					"errors": {
						"codes": [133],
						"details": [{
							"code": 133,
							"message": "The service you are trying to reach is not reachable at this moment."
						}]
					}
				});
				done();
			});
		});
		it('Testing /example02 w/o starting service', function(done) {
			requester('get', {
				uri: 'http://localhost:4000/example02'
			}, function(err, body, response) {
				assert.ifError(err);
				assert.equal(response.statusCode, 200);
				assert.deepEqual(body, {
					"result": false,
					"errors": {
						"codes": [132],
						"details": [{"code": 132, "message": "A valid key is needed to access any API."}]
					}
				});
				done();
			});
		});
	});

	describe('Testing example01 via controllerServer w/services', function() {
		var service = new soajs.server.service({
			"bodyParser": true,
			"methodOverride": true,
			"cookieParser": true,
			"logger": true,
			"inputmask": true,
			"session": false,
			"security": false,
			"multitenant": false,
			"acl": false,
			"awareness":false,
			"config": {
				"serviceName": 'example01',
				"serviceVersion": 1,
				"servicePort": 4010,
				"extKeyRequired": false,
				errors: {},
				schema: {
					"/validService": {
						"_apiInfo": {
							"l": "Valid Service"
						},
						"firstName": {
							"source": ['query.firstName'],
							"required": false,
							"validation": {
								"type": "string"
							}
						}

					}
				}
			}
		});

		before(function(done) {
			service.init(function() {
				service.get("/validService", function(req, res) {
					res.json(req.soajs.buildResponse(null, {test: true}));
				});
				service.start(function(err) {
					assert.ifError(err);
					setTimeout(function() {
						assert.ifError(err);
						done();
					}, 1000);
				});
			});
		});
		after(function(done) {
			service.stop(function(err) {
				assert.ifError(err);
				done();
			});
		});
		it('Testing /example01 version 1', function(done) {
			requester('get', {
				uri: 'http://localhost:4000/example01:1'
			}, function(err, body, response) {
				assert.ifError(err);
				assert.equal(response.statusCode, 200);
				assert.deepEqual(body, {
					"result": false,
					"errors": {
						"codes": [151],
						"details": [{"code": 151, "message": "You are trying to reach an unknown rest service!"}]
					}
				});
				done();
			});
		});
		it('Testing /example01/wrongService', function(done) {
			requester('get', {
				uri: 'http://localhost:4000/example01/wrongService'
			}, function(err, body, response) {
				assert.ifError(err);
				assert.equal(response.statusCode, 200);
				assert.deepEqual(body, {
					"result": false,
					"errors": {
						"codes": [151],
						"details": [{"code": 151, "message": "You are trying to reach an unknown rest service!"}]
					}
				});
				done();
			});
		});
		it('Testing /example01/validService', function(done) {
			requester('get', {
				uri: 'http://localhost:4010/validService'
			}, function(err, body, response) {
				assert.ifError(err);
				assert.equal(response.statusCode, 200);
				assert.deepEqual(body, {"result": true, "data": {"test": true}});
				done();
			});
		});
		it('Testing /example01/heartbeat', function(done) {
			requester('get', {
				uri: 'http://localhost:5010/heartbeat'
			}, function(err, body, response) {
				assert.ifError(err);
				assert.equal(response.statusCode, 200);
				delete body.ts;
				assert.deepEqual(body, {
					"result": true,
					"service": {"service": "EXAMPLE01", "type": "rest", "route": "/heartbeat"}
				});
				done();
			});
		});
	});

	describe('Testing example03 via controllerServer w/services', function() {
		var service = new soajs.server.service({
			"bodyParser": true,
			"cookieParser": true,
			"logger": true,
			"inputmask": true,
			"session": false,
			"security": false,
			"multitenant": false,
			"acl": false,
			"config": {
				"serviceName": 'example03',
				"serviceVersion": 1,
				"servicePort": 4012,
				errors: {},
				schema: {
					"/validService": {
						"_apiInfo": {
							"l": "Valid Service"
						},
						"firstName": {
							"source": ['query.firstName'],
							"required": false,
							"validation": {
								"type": "string"
							}
						}
					}
				}
			}
		});

		before(function(done) {
			service.init(function() {
				service.get("/validService", function(req, res) {
					res.json(req.soajs.buildResponse(null, {test: true}));
				});

				service.start(function(err) {
					assert.ifError(err);
					setTimeout(function() {
						done();
					}, 500);
				});
			});
		});
		after(function(done) {
			service.stop(function(err) {
				assert.ifError(err);
				done();
			});
		});
		it('Testing /example03/validService with valid key via direct in header', function(done) {
			requester('get', {
				uri: 'http://localhost:4000/example03/validService',
				headers: {'key': 'aa39b5490c4a4ed0e56d7ec1232a428f7ad78ebb7347db3fc9875cb10c2bce39bbf8aabacf9e00420afb580b15698c04ce10d659d1972ebc53e76b6bbae0c113bee1e23062800bc830e4c329ca913fefebd1f1222295cf2eb5486224044b4d0c'}
			}, function(err, body, response) {
				assert.ifError(err);
				assert.equal(response.statusCode, 200);
				assert.deepEqual(body, {"result": true, "data": {"test": true}});
				done();
			});
		});
		it('Testing /example03/validService with valid key via controller in qs', function(done) {
			requester('get', {
				uri: 'http://localhost:4000/example03/validService?key=aa39b5490c4a4ed0e56d7ec1232a428f7ad78ebb7347db3fc9875cb10c2bce39bbf8aabacf9e00420afb580b15698c04ce10d659d1972ebc53e76b6bbae0c113bee1e23062800bc830e4c329ca913fefebd1f1222295cf2eb5486224044b4d0c'
			}, function(err, body, response) {
				assert.ifError(err);
				assert.equal(response.statusCode, 200);
				assert.deepEqual(body, {"result": true, "data": {"test": true}});
				done();
			});
		});
	});

	describe("testing awareness controller", function() {
		it('Testing /awarenessStat', function(done) {
			requester('get', {
				uri: 'http://localhost:5000/awarenessStat'
			}, function(err, body, response) {
				assert.ifError(err);
				assert.equal(response.statusCode, 200);
				assert.equal(response.headers['content-type'], 'application/json');
				done();
			});
		});
	});

	after(function(done) {
		controllerApp.stop(function() {
			done();
		});
	});
});
