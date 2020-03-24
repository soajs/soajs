"use strict";
var assert = require("assert");
var async = require("async");
var helper = require("../helper.js");

var soajs = helper.requireModule('index.js');
var utils = require('soajs.core.libs').utils;

var Mongo = soajs.mongo;
var Hasher = helper.hasher;
var requester = helper.requester;

var tenantConfig = {
	"name": 'test_urac',
	"prefix": "",
	"servers": [
		{
			"host": "127.0.0.1",
			"port": "27017"
		}
	],
	"credentials": null,
	"URLParam": {
		"connectTimeoutMS": 0,
		"socketTimeoutMS": 0,
		"maxPoolSize": 5,
		"w": 1,
		"wtimeoutMS": 0,
		"slaveOk": true
	},
	"extraParam": {
		"db": {
			"native_parser": true
		},
		"server": {
			"auto_reconnect": true
		}
	},
	'store': {},
	"collection": "sessions",
	'stringify': false,
	'expireAfter': 1000 * 60 * 60 * 24 * 14 // 2 weeks
};
var tenantMongo = new Mongo(tenantConfig);

var testTenant = require("soajs.mongodb.data/modules/soajs/data/tenant.js");

var holder = {
	controller: null,
	oauth: null,
	service: null,
	service2: null,
	daemon: null
};

var lib = {
	startController: function (cb) {
		holder.controller = new soajs.server.controller();
		holder.controller.init(function () {
			holder.controller.start(cb);
		});
	},
	stopController: function (cb) {
		holder.controller.stop(cb);
	},
	
	startOauth: function (cb) {
		var config = {
			"serviceName": "oauth",
			"servicePort": 4002,
			"hashIterations": 1024,
			"seedLength": 32,
			"errors": {
				400: "Problem with the provided password.",
				401: "Unable to log in the user. User not found.",
				402: "User does not have access to this product",
				403: "User does not have access to this tenant"
			},
			"schema": {
				"/token": {
					"_apiInfo": {
						"l": "Create Token"
					},
					"username": {
						"source": ['body.username'],
						"required": true,
						"default": "user10001",
						"validation": {
							"type": "string"
						}
					},
					"grant_type": {
						"default": "password",
						"source": ['body.grant_type'],
						"required": true,
						"validation": {
							"type": "string"
						}
					},
					"password": {
						"source": ['body.password'],
						"required": true,
						"validation": {
							"type": "string"
						}
					}
				},
				"/kill": {
					"_apiInfo": {
						"l": "Kill Token"
					},
					"access_token": {
						"source": ['query.access_token'],
						"required": true,
						"validation": {
							"type": "string"
						}
					}
				}
			}
		};
		
		holder.oauth = new soajs.server.service({
			"oauth": true,
			"security": true,
			"oauthService": {
				"name": config.serviceName,
				"tokenApi": "/token"
			},
			"config": config
		});
		
		holder.oauth.init(function () {
			var userCollectionName = "users";
			var Hasher = helper.hasher;
			var Mongo = require("soajs.core.modules").mongo;
			var mongo = null;

            if (!holder.oauth.oauth) {
                var coreModules = require("soajs.core.modules");
                var provision = coreModules.provision;
                var oauthserver = require('oauth2-server');
                var reg = holder.oauth.registry.get();
                holder.oauth.oauth = oauthserver({
                    model: provision.oauthModel,
                    grants: reg.serviceConfig.oauth.grants,
                    debug: reg.serviceConfig.oauth.debug,
                    accessTokenLifetime: reg.serviceConfig.oauth.accessTokenLifetime,
                    refreshTokenLifetime: reg.serviceConfig.oauth.refreshTokenLifetime
                });
                provision.init(reg.coreDB.provision, holder.oauth.log);
                provision.loadProvision(function (loaded) {
                    if (loaded)
                        holder.oauth.log.info("Service provision loaded.");
                });
            }

			function login(req, cb) {
				if (!mongo) {
					mongo = new Mongo(tenantConfig);
				}
				mongo.findOne(userCollectionName, {'username': req.soajs.inputmaskData['username']}, function (err, record) {
					if (record) {
						var hashConfig = {
							"hashIterations": req.soajs.registry.serviceConfig.oauth.hashIterations || config.hashIterations,
							"seedLength": req.soajs.registry.serviceConfig.oauth.seedLength || config.seedLength
						};
						var hasher = new Hasher(hashConfig);
						hasher.compare(req.soajs.inputmaskData.password, record.password, function (err, result) {
							if (err) {
								return cb(400);
							}
							
							if (!result) {
								return cb(401);
							}
							
							delete record.password;
							if (record.tId) {
								if (record.tId.toString() !== req.soajs.tenant.id) {
									return cb(403);
								}
							}
							//TODO: keys here
							return cb(null, record);
						});
					}
					else {
						return cb(401);
					}
				});
			}
			
			holder.oauth.post("/token", function (req, res, next) {
				holder.oauth.oauth.model["getUser"] = function (username, password, callback) {
					login(req, function (errCode, record) {
						if (errCode) {
							var error = new Error(config.errors[errCode]);
							return callback(error);
						}
						else {
							return callback(false, {"id": record._id.toString()});
						}
					});
				};
				next();
			}, holder.oauth.oauth.grant());
			
			holder.oauth.delete("/kill", function (req, res) {
				mongo = new Mongo(req.soajs.registry.coreDB.provision);
				mongo.remove("oauth_tokens", {}, function (error) {
					assert.ifError(error);
					return res.json(req.soajs.buildResponse(null, true));
				});
			});
			
			holder.oauth.start(function () {
				//setTimeout(function() {
				cb();
				//}, 500);
			});
		});
	},
	stopOauth: function (cb) {
		holder.oauth.stop(cb);
	},
	
	stopTestService: function (cb) {
		holder.service.stop(cb);
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
		
		holder.service = new soajs.server.service({
			"oauth": true,
			"session": true,
			"security": true,
			"multitenant": true,
			"acl": true,
			"bodyParser": true,
			"methodOverride": true,
			"cookieParser": true,
			"logger": true,
			"inputmask": true,
			"config": config
		});
		
		holder.service.init(function () {
			holder.service.post("/testRoute", function (req, res) {
				res.json(req.soajs.buildResponse(null, req.soajs.inputmaskData));
			});
			
			holder.service.post("/testRoute2", function (req, res) {
					res.json(req.soajs.buildResponse(null, req.soajs.inputmaskData));
			});
			
			holder.service.post("/testRoute3", function (req, res) {
				console.log("waiting 15000 milliseconds before returning a response .... do not stop the test execution");
				setTimeout(function () {
					res.json(req.soajs.buildResponse(null, req.soajs.inputmaskData));
				}, 15000);
			});
			
			holder.service.start(function () {
				//setTimeout(function() {
				cb();
				//}, 500);
			});
		});
	},
	
	stopDaemon: function (cb) {
		holder.daemon.stop(cb);
	},
	startDaemon: function (cb) {
		holder.daemon = new soajs.server.daemon({
			"config": {
				serviceName: "helloDaemon",
				"serviceVersion": 1,
				"servicePort": 4200,
				"errors": {},
				"schema": {
					"hello": {
						"l": "hello world"
					}
				}
			}
		});
		
		holder.daemon.init(function () {
			holder.daemon.job("hello", function (soajs, next) {
				soajs.log.info("HELLO daemon");
				next();
			});
			holder.daemon.start(function (err) {
				assert.ifError(err);
				setTimeout(function () {
					cb();
				}, 500);
			});
		});
	}
};

describe("testing multi tenancy", function () {
	var auth;
	
	before(function (done) {
		lib.startOauth(function () {
			lib.startTestService(function () {
				lib.startDaemon(function () {
					lib.startController(function () {
						tenantMongo.remove('users', {}, function (error) {
							assert.ifError(error);
							tenantMongo.remove('groups', {}, function (error) {
								assert.ifError(error);
								setTimeout(function () {
									console.log("services started, waiting 6 sec to proceed...");
									done();
								}, 3000);
							});
						});
					});
				});
			});
		});
	});
	
	it('will add user to db', function (done) {
		var userRecord = {
			"username": "user10001",
			"password": "$2a$04$yn9yaxQysIeH2VCixdovJ.TLuOEjFjS5D2Otd7sO7uMkzi9bXX1tq",
			"firstName": "User",
			"lastName": "One",
			"email": "user.one@mydomain.com",
			"status": "active",
			"profile": {},
			"tenant": {
				"id": testTenant._id.toString(),
				"code": testTenant.code
			},
			"groups": ['vip', 'admin'],
			"config": {
				"packages": {
					"TPROD_BASIC": { //URACPACKAGE
						"acl": { //URACPACKAGEACL
							"urac": {},
							"example03": {},
							"example02": {}
						}
					}
				},
				"keys": {
					"695d3456de70fddc9e1e60a6d85b97d3": { //URACKEY
						"config": { //URACKEYCONFIG
							"urac": {}
						},
						"acl": { //URACKEYACL
							"urac": {},
							"example03": {
								"access": ['admin'],
								"apis": {
									"/testRoute": {'access': ['admin']}
								}
							},
							"example02": {
								'access': true,
								"apisPermission": 'restricted',
								"apis": {
									"/testRoute2": {"access": ['admin']}
								},
								"apisRegExp": [
									{
										'regExp': /^\/testRoute$/,
										'access': true
									}
								]
							}
						}
					}
				},
				"dashboard": [
					"members",
					"environments",
					"productization",
					"productization_packages",
					"multi-tenancy",
					"multi-tenancy_applications",
					"multi-tenancy_keys"
				]
			}
		};
		tenantMongo.insert('users', userRecord, function (error, response) {
			assert.ifError(error);
			assert.ok(response);
			var groupRecord = {
				"code": "admin",
				"name": "administrator",
				"description": "admin test group",
				"tenant": {
					"id": testTenant._id.toString(),
					"code": testTenant.code
				},
				"config": {
					"packages": {
						"TPROD_BASIC": { //URACPACKAGE
							"acl": { //URACPACKAGEACL
								"urac": {},
								"example03": {},
								"example02": {}
							}
						}
					},
					"keys": {
						"695d3456de70fddc9e1e60a6d85b97d3": { //URACKEY
							"config": { //URACKEYCONFIG
								"urac": {}
							},
							"acl": { //URACKEYACL
								"urac": {},
								"example03": {
									"access": ['admin'],
									"apis": {
										"/testRoute": {'access': ['admin']}
									}
								},
								"example02": {
									'access': true,
									"apisPermission": 'restricted',
									"apis": {
										"/testRoute2": {"access": ['admin']}
									},
									"apisRegExp": [
										{
											'regExp': /^\/testRoute$/,
											'access': true
										}
									]
								}
							}
						}
					},
					"dashboard": [
						"members",
						"environments",
						"productization",
						"productization_packages",
						"multi-tenancy",
						"multi-tenancy_applications",
						"multi-tenancy_keys"
					]
				}
			};
			tenantMongo.insert('groups', groupRecord, function (error, response) {
				assert.ifError(error);
				assert.ok(response);
				done();
			});
		});
	});
	
	it("login user", function (done) {
		
		var params = {
			uri: 'http://localhost:4000/oauth/token',
			headers: {
				'accept': '*/*',
				'content-type': 'application/x-www-form-urlencoded',
				"Authorization": 'Basic MTBkMmNiNWZjMDRjZTUxZTA2MDAwMDAxOnNoaGggdGhpcyBpcyBhIHNlY3JldA==',
				key: testTenant.applications[1].keys[0].extKeys[0].extKey
			},
			body: 'username=user10001&password=123456&grant_type=password',
			json: true,
		};
		
		requester('post', params, function (err, body) {
			assert.ifError(err);
			assert.ok(body);
			auth = body.access_token;
			done();
		});
	});
	
	describe('hit example03', function () {
		it('calling example03 using key 1 in application 2 - fail, missing fields', function (done) {
			requester('post', {
				uri: 'http://localhost:4000/example03/testRoute',
				headers: {
					key: testTenant.applications[1].keys[0].extKeys[0].extKey
				},
				qs: {
					access_token: auth
				},
				body: {
					'info': /^\/testRoute\/$/
				}
			}, function (err, body) {
				assert.ifError(err);
				assert.ok(body);
				assert.ok(!body.result);
				assert.ok(body.errors);
				done();
			});
		});
		
		it('calling example03 using key 1 in application 2 - fail, wrong validation', function (done) {
			requester('post', {
				uri: 'http://localhost:4000/example03/testRoute',
				headers: {
					key: testTenant.applications[1].keys[0].extKeys[0].extKey
				},
				qs: {
					access_token: auth
				},
				body: {
					'user': 'this input should be an object not a string',
					'name': [1, 2, 3],
					'info': /^\/testRoute\/$/
				}
			}, function (err, body) {
				assert.ifError(err);
				assert.ok(body);
				assert.ok(!body.result);
				assert.ok(body.errors);
				done();
			});
		});
		
		it('calling example03 using key 1 in application 2', function (done) {
			requester('post', {
				uri: 'http://localhost:4000/example03/testRoute',
				headers: {
					key: testTenant.applications[1].keys[0].extKeys[0].extKey
				},
				qs: {
					access_token: auth
				},
				body: {
					'user': {
						'name': 'User One',
						'genre': 'male'
					},
					'name': 'user name',
					'info': /^\/testRoute\/$/
				}
			}, function (err, body) {
				assert.ifError(err);
				assert.ok(body);
				assert.ok(body.result);
				assert.ok(body.data);
				assert.deepEqual(body.data, {
					'user': {
						'name': 'User One',
						'genre': 'male'
					},
					'name': 'user name',
					'info': {},
					'age': 30
				});
				done();
			});
		});
		
		it('calling example03 using key 2 in application 2 external key 1', function (done) {
			requester('post', {
				uri: 'http://localhost:4000/example03/testRoute',
				headers: {
					key: testTenant.applications[1].keys[1].extKeys[0].extKey
				},
				qs: {
					access_token: auth
				},
				body: {
					'user': {
						'name': 'User One',
						'genre': 'male'
					},
					'name': 'user one',
					'info': /^\/testRoute\/$/
				}
			}, function (err, body) {
				assert.ifError(err);
				assert.ok(body);
				assert.ok(body.result);
				assert.ok(body.data);
				assert.deepEqual(body.data, {
					'user': {
						'name': 'User One',
						'genre': 'male'
					},
					'name': 'user one',
					'info': {},
					'age': 30
				});
				done();
			});
		});
		
		it('calling example03 using key 2 in application 2 external key 2', function (done) {
			requester('post', {
				uri: 'http://localhost:4000/example03/testRoute',
				headers: {
					key: testTenant.applications[1].keys[1].extKeys[1].extKey
				},
				qs: {
					access_token: auth
				},
				body: {
					'user': {
						'name': 'User One',
						'genre': 'male'
					},
					'name': 'user one',
					'info': /^\/testRoute\/$/
				}
			}, function (err, body) {
				assert.ifError(err);
				assert.ok(body);
				assert.ok(body.result);
				assert.ok(body.data);
				assert.deepEqual(body.data, {
					'user': {
						'name': 'User One',
						'genre': 'male'
					},
					'name': 'user one',
					'info': {},
					'age': 30
				});
				done();
			});
		});
		
		it("calling example03 testRoute2", function (done) {
			requester('post', {
				uri: 'http://localhost:4000/example03/testRoute2',
				headers: {
					key: testTenant.applications[1].keys[1].extKeys[1].extKey
				},
				qs: {
					access_token: auth
				},
				body: {
					'user': {
						'name': 'User One',
						'genre': 'male'
					},
					'name': 'user one',
					'info': /^\/testRoute\/$/
				}
			}, function (err, body) {
				assert.ifError(err);
				assert.ok(body);
				assert.ok(body.result);
				assert.ok(body.data);
				done();
			});
		});
		
		it("calling example03 testRoute3 with a timeout value", function (done) {
			requester('post', {
				uri: 'http://localhost:4000/example03/testRoute3',
				headers: {
					key: testTenant.applications[1].keys[1].extKeys[1].extKey
				},
				qs: {
					access_token: auth
				},
				body: {
					'user': {
						'name': 'User One',
						'genre': 'male'
					},
					'name': 'user one',
					'info': /^\/testRoute\/$/
				}
			}, function (err, body) {
				assert.ifError(err);
				assert.ok(body);
				assert.ok(!body.result);
				assert.ok(body.errors);
				done();
			});
		});
	});
	
	describe("logout and hit the apis", function () {
		it("logout user", function (done) {
			requester('get', {
				uri: 'http://localhost:4000/oauth/kill',
				headers: {
					key: testTenant.applications[1].keys[0].extKeys[0].extKey
				},
				qs: {
					"access_token": auth
				}
			}, function (err, body) {
				assert.ifError(err);
				assert.ok(body);
				done();
			});
		});
		
		it('calling example03 after logout', function (done) {
			requester('post', {
				uri: 'http://localhost:4000/example03/testRoute',
				headers: {
					key: testTenant.applications[1].keys[0].extKeys[0].extKey
				},
				qs: {
					"access_token": auth
				},
				body: {
					'user': {
						'name': 'User One',
						'genre': 'male'
					},
					'name': 'user one'
				}
			}, function (err, body) {
				assert.ifError(err);
				assert.ok(body);
				assert.ok(!body.result);
				assert.ok(body.errors);
				done();
			});
		});
	});
	
	describe("stopping services", function () {
		it("do stop", function (done) {
			async.parallel([
				lib.stopController,
				lib.stopTestService,
				lib.stopOauth,
				lib.stopDaemon
			], function () {
				done();
			});
		});
	});
});