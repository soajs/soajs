"use strict";
var assert = require("assert");
var async = require("async");
var helper = require("../helper.js");

var soajs = helper.requireModule('index.js');
var utils = helper.requireModule('lib/utils.js');

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
	urac: null,
	service: null,
	service2: null
};

var lib = {
	startController: function(cb) {
		holder.controller = new soajs.server.controller();
		holder.controller.init(function() {
			holder.controller.start(cb);
		});
	},
	stopController: function(cb) {
		holder.controller.stop(cb);
	},

	startUrac: function(cb) {
		var config = {
			"serviceName": "urac",
			"errors": {
				"401": "error logging in try again"
			},
			"schema": {
				"/logout": {
					"_apiInfo": {
						"l": "Logout"
					}
				},
				"/login": {
					"_apiInfo": {
						"l": "Login"
					},
					"username": {
						"required": true,
						"source": ['body.username'],
						"validation": {"type": "string"}
					},
					"password": {
						"required": true,
						"source": ['body.password'],
						"validation": {"type": "string"}
					}
				}
			}
		};

		holder.urac = new soajs.server.service({
			"oauth": false,
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
		holder.urac.init(function() {
			holder.urac.get("/logout", function(req, res) {
				req.soajs.session.clearURAC(function(err) {
					res.json(req.soajs.buildResponse(null, true));
				});
			});

			holder.urac.post("/login", function(req, res) {
				var criteria = {'username': req.soajs.inputmaskData['username'], 'status': 'active'};

				tenantMongo.findOne("users", criteria, function(err, record) {
					if(record) {
						var hasher = new Hasher({
							"hashIterations": req.soajs.servicesConfig.urac.hashIterations,
							"seedLength": req.soajs.servicesConfig.urac.seedLength
						});
						hasher.compare(req.soajs.inputmaskData.password, record.password, function(err, response) {
							if(err || !response) {
								return res.jsonp(req.soajs.buildResponse({"code": 401, "msg": config.errors[401]}));
							}
							var cloneRecord = utils.cloneObj(record);
							req.soajs.session.setURAC(cloneRecord, function(err) {
								if(err) {
									return res.jsonp(req.soajs.buildRestResponse({
										"code": 401,
										"msg": config.errors[401]
									}));
								}

								req.soajs.session.setSERVICE({'user': req.soajs.inputmaskData}, function(error) {
									if(error) {
										return res.jsonp(req.soajs.buildResponse({
											"code": 401,
											"msg": config.errors[401]
										}));
									}
									var newKey = Object.keys(cloneRecord.config.keys)[0];
									req.soajs.session.setURACKEYCONFIG(cloneRecord.config.keys[newKey].config, function(error) {
										if(error) {
											return res.jsonp(req.soajs.buildResponse({
												"code": 401,
												"msg": config.errors[401]
											}));
										}

										var newAcl = cloneRecord.config.keys[newKey].acl;
										req.soajs.session.setURACKEYACL(newAcl, function(error) {
											if(error) {
												return res.jsonp(req.soajs.buildResponse({
													"code": 401,
													"msg": config.errors[401]
												}));
											}

											req.soajs.session.setURACPACKAGEACL(newAcl, function(error) {
												if(error) {
													return res.jsonp(req.soajs.buildResponse({
														"code": 401,
														"msg": config.errors[401]
													}));
												}

												return res.jsonp(req.soajs.buildResponse(null, record));
											});
										});
									});
								});
							});
						});
					} else {
						return res.jsonp(req.soajs.buildResponse({"code": 401, "msg": config.errors[401]}));
					}
				});
			});

			holder.urac.start(function() {
				setTimeout(function() {
					cb();
				}, 500);
			});
		});
	},
	stopUrac: function(cb) {
		holder.urac.stop(cb);
	},

	stopTestService: function(cb) {
		holder.service.stop(cb);
	},
	startTestService: function(cb) {
		var config = {
			"serviceName": "example03",
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
			"oauth": false,
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

		holder.service.init(function() {
			holder.service.post("/testRoute", function(req, res) {
				res.json(req.soajs.buildResponse(null, req.soajs.inputmaskData));
			});

			holder.service.post("/testRoute2", function(req, res) {
				console.log("waiting 15000 milliseconds before returning a response .... do not stop the test execution");
				setTimeout(function() {
					res.json(req.soajs.buildResponse(null, req.soajs.inputmaskData));
				}, 15000);
			});

			holder.service.start(function() {
				setTimeout(function() {
					cb();
				}, 500);
			});
		});
	},

	stopTestService2: function(cb) {
		holder.service2.stop(cb);
	},
	startTestService2: function(cb) {
		var config = {
			"serviceName": "example02",
			"errors": {
				"401": "error logging in try again"
			},
			"schema": {
				"/testRoute": {
					"_apiInfo": {
						"l": "Test Route"
					},
					"user": {
						"required": true,
						"source": ['body.user'],
						"validation": {"type": "object"}
					}
				},
				"/testRoute2": {
					"_apiInfo": {
						"l": "Test Route2"
					},
					"user": {
						"required": true,
						"source": ['body.user'],
						"validation": {"type": "object"}
					}
				},
				"/noRoute": {
					"_apiInfo": {
						"l": "NO Route"
					},
					"user": {
						"required": true,
						"source": ['body.user'],
						"validation": {"type": "object"}
					}
				}
			}
		};

		holder.service2 = new soajs.server.service({
			"oauth": false,
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

		holder.service2.init(function() {
			holder.service2.post("/testRoute", function(req, res) {
				res.json(req.soajs.buildResponse(null, req.soajs.inputmaskData));
			});

			holder.service2.post("/testRoute2", function(req, res) {
				res.json(req.soajs.buildResponse(null, req.soajs.inputmaskData));
			});

			holder.service2.get("/noRoute", function(req, res) {
				res.json(req.soajs.buildResponse(null, req.soajs.inputmaskData));
			});

			holder.service2.start(function() {
				setTimeout(function() {
					cb();
				}, 500);
			});
		});
	}
};

describe("testing multi tenantcy", function() {
	var auth;

	before(function(done) {
		lib.startUrac(function() {
			lib.startTestService(function() {
				lib.startTestService2(function() {
					lib.startController(function() {
						tenantMongo.remove('users', {}, function(error) {
							assert.ifError(error);
							done();
						});
					});
				});
			});
		});
	});

	after(function(done) {
		lib.stopTestService(function() {
			lib.stopTestService2(function() {
				lib.stopUrac(function() {
					lib.stopController(function() {
						done();
					});
				});
			});
		});
	});

	it('will add user to db', function(done) {
		var userRecord = {
			"username": "user10001",
			"password": "$2a$04$yn9yaxQysIeH2VCixdovJ.TLuOEjFjS5D2Otd7sO7uMkzi9bXX1tq",
			"firstName": "User",
			"lastName": "One",
			"email": "user.one@mydomain.com",
			"status": "active",
			"profile": {},
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
		tenantMongo.insert('users', userRecord, function(error, response) {
			assert.ifError(error);
			assert.ok(response);
			done();
		});
	});

	it("login user", function(done) {
		requester('post', {
			uri: 'http://localhost:4000/urac/login',
			headers: {
				key: testTenant.applications[1].keys[0].extKeys[0].extKey
			},
			body: {
				'username': 'user10001',
				'password': '123456'
			}
		}, function(err, body) {
			assert.ifError(err);
			assert.ok(body);
			auth = body.soajsauth;
			done();
		});
	});

	describe('hit example03', function() {
		it('calling example03 using key 1 in application 2 - fail, missing fields', function(done) {
			requester('post', {
				uri: 'http://localhost:4000/example03/testRoute',
				headers: {
					key: testTenant.applications[1].keys[0].extKeys[0].extKey,
					soajsauth: auth
				},
				body: {
					'info': /^\/testRoute\/$/
				}
			}, function(err, body) {
				assert.ifError(err);
				assert.ok(body);
				assert.ok(!body.result);
				assert.ok(body.errors);
				done();
			});
		});

		it('calling example03 using key 1 in application 2 - fail, wrong validation', function(done) {
			requester('post', {
				uri: 'http://localhost:4000/example03/testRoute',
				headers: {
					key: testTenant.applications[1].keys[0].extKeys[0].extKey,
					soajsauth: auth
				},
				body: {
					'user': 'this input should be an object not a string',
					'name': [1, 2, 3],
					'info': /^\/testRoute\/$/
				}
			}, function(err, body) {
				assert.ifError(err);
				assert.ok(body);
				assert.ok(!body.result);
				assert.ok(body.errors);
				done();
			});
		});

		it('calling example03 using key 1 in application 2', function(done) {
			requester('post', {
				uri: 'http://localhost:4000/example03/testRoute',
				headers: {
					key: testTenant.applications[1].keys[0].extKeys[0].extKey,
					soajsauth: auth
				},
				body: {
					'user': {
						'name': 'User One',
						'genre': 'male'
					},
					'name': 'user name',
					'info': /^\/testRoute\/$/
				}
			}, function(err, body) {
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

		it('calling example03 using key 2 in application 2 external key 1', function(done) {
			requester('post', {
				uri: 'http://localhost:4000/example03/testRoute',
				headers: {
					key: testTenant.applications[1].keys[1].extKeys[0].extKey,
					soajsauth: auth
				},
				body: {
					'user': {
						'name': 'User One',
						'genre': 'male'
					},
					'name': 'user one',
					'info': /^\/testRoute\/$/
				}
			}, function(err, body) {
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

		it('calling example03 using key 2 in application 2 external key 2', function(done) {
			requester('post', {
				uri: 'http://localhost:4000/example03/testRoute',
				headers: {
					key: testTenant.applications[1].keys[1].extKeys[1].extKey,
					soajsauth: auth
				},
				body: {
					'user': {
						'name': 'User One',
						'genre': 'male'
					},
					'name': 'user one',
					'info': /^\/testRoute\/$/
				}
			}, function(err, body) {
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

		it("calling example03 using with a timeout value", function(done) {
			requester('post', {
				uri: 'http://localhost:4000/example03/testRoute2',
				headers: {
					key: testTenant.applications[1].keys[1].extKeys[1].extKey,
					soajsauth: auth
				},
				body: {
					'user': {
						'name': 'User One',
						'genre': 'male'
					},
					'name': 'user one',
					'info': /^\/testRoute\/$/
				}
			}, function(err, body) {
				assert.ifError(err);
				assert.ok(body);
				assert.ok(body.result);
				assert.ok(body.data);
				done();
			});
		});
	});

	describe("hit example02", function() {
		it('calling example02', function(done) {
			requester('post', {
				uri: 'http://localhost:4000/example02/testRoute',
				headers: {
					key: testTenant.applications[1].keys[0].extKeys[0].extKey,
					soajsauth: auth
				},
				body: {
					'user': {
						'name': 'User One',
						'genre': 'male'
					}
				}
			}, function(err, body) {
				assert.ifError(err);
				assert.ok(body);
				assert.ok(body.result);
				assert.ok(body.data);
				assert.deepEqual(body.data, {
					'user': {
						'name': 'User One',
						'genre': 'male'
					}
				});
				done();
			});
		});

		it('calling example02 restricted route', function(done) {
			requester('post', {
				uri: 'http://localhost:4000/example02/testRoute2',
				headers: {
					key: testTenant.applications[1].keys[0].extKeys[0].extKey,
					soajsauth: auth
				},
				body: {
					'user': {
						'name': 'User One',
						'genre': 'male'
					}
				}
			}, function(err, body) {
				assert.ifError(err);
				assert.ok(body);
				assert.ok(body.result);
				assert.ok(body.data);
				assert.deepEqual(body.data, {
					'user': {
						'name': 'User One',
						'genre': 'male'
					}
				});
				done();
			});
		});

		it('calling example02 third unaccessible route', function(done) {
			requester('post', {
				uri: 'http://localhost:4000/example02/noRoute',
				headers: {
					key: testTenant.applications[1].keys[0].extKeys[0].extKey,
					soajsauth: auth
				},
				body: {
					'user': {
						'name': 'User One',
						'genre': 'male'
					}
				}
			}, function(err, body) {
				assert.ifError(err);
				assert.ok(body);
				console.log(JSON.stringify(body));
				assert.ok(!body.result);
				assert.ok(body.errors);
				done();
			});
		});
	});

	describe("logout and hit the apis", function() {
		it("logout user", function(done) {
			requester('get', {
				uri: 'http://localhost:4000/urac/logout',
				headers: {
					key: testTenant.applications[1].keys[0].extKeys[0].extKey,
					soajsauth: auth
				}
			}, function(err, body) {
				assert.ifError(err);
				assert.ok(body);
				console.log(body);
				done();
			});
		});

		it('calling example03 after logout', function(done) {
			requester('post', {
				uri: 'http://localhost:4000/example03/testRoute',
				headers: {
					key: testTenant.applications[1].keys[0].extKeys[0].extKey,
					soajsauth: auth
				},
				body: {
					'user': {
						'name': 'User One',
						'genre': 'male'
					},
					'name': 'user one'
				}
			}, function(err, body) {
				assert.ifError(err);
				assert.ok(body);
				console.log(JSON.stringify(body));
				assert.ok(!body.result);
				assert.ok(body.errors);
				done();
			});
		});
	});
});