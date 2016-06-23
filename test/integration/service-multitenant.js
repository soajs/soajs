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
	service2: null,
	daemon: null
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
			"servicePort": 4001,
			"extKeyRequired": true,
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
					req.soajs.session.deleteTenantSession(function() {
						res.json(req.soajs.buildResponse(err, true));
					});
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

							//Get Groups config
							if (record.groups && Array.isArray(record.groups) && record.groups.length > 0) {
								tenantMongo.find("groups", {
									"code": {"$in": record.groups}
								}, function (err, groups) {
									record.groupsConfig = null;
									if (err)
										req.soajs.log.error(err);
									else
										record.groupsConfig = groups;

									proceed(record);
								});
							}
							else {
								proceed(record);
							}
						});
					} else {
						return res.jsonp(req.soajs.buildResponse({"code": 401, "msg": config.errors[401]}));
					}
				});
				
				function proceed(record){
					var cloneRecord = utils.cloneObj(record);
					req.soajs.session.setURAC(cloneRecord, function(err) {
						if(err) {
							return res.jsonp(req.soajs.buildResponse({
								"code": 401,
								"msg": config.errors[401]
							}));
						}

						var all = req.soajs.session.getUrac(true);

						req.soajs.session.setSERVICE({'user': req.soajs.inputmaskData}, function(error) {
							if(error) {
								return res.jsonp(req.soajs.buildResponse({
									"code": 401,
									"msg": config.errors[401]
								}));
							}

							var groups = req.soajs.session.getGroups();

							if(cloneRecord.config.keys && Object.keys(cloneRecord.config.keys).length > 0){
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

										proceedAgain(newAcl, record);
									});
								});
							}
							else{
								var acl = {};
								if(record.config && record.config.packags && record.config.packages['TPROD_BASIC'].acl){
									acl = record.config.packages['TPROD_BASIC'].acl;
								}
								if(record.username === 'user10004'){
									var cloneRecord2 = utils.cloneObj(record);
									cloneRecord2.config = {key: {}, packages: {} };
									req.soajs.session.setURAC(cloneRecord2, function(err) {
										proceedAgain(acl, record, false);
									});
								}
								else{
									proceedAgain(acl, record, true);
								}
							}
						});
					});
				}

				function proceedAgain(newAcl, record, updatepackageAcl){
					if(updatepackageAcl){
						req.soajs.session.setURACPACKAGEACL(newAcl, function(error) {
							if(error) {
								return res.jsonp(req.soajs.buildResponse({
									"code": 401,
									"msg": config.errors[401]
								}));
							}
							leave(record);
						});
					}
					else{
						leave(record);
					}
				}

				function leave(record){
					var acl = req.soajs.session.getAcl();

					var packageAcl = req.soajs.session.getPackageAcl();

					var onePackageAcl = req.soajs.session.getPackageAcl('TPROD_BASIC');

					var getAclAllEnv = req.soajs.session.getAclAllEnv();

					return res.jsonp(req.soajs.buildResponse(null, record));
				}
			});

			holder.urac.start(function() {
				//setTimeout(function() {
					cb();
				//}, 500);
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
				//setTimeout(function() {
					cb();
				//}, 500);
			});
		});
	},

	stopTestService2: function(cb) {
		holder.service2.stop(cb);
	},
	startTestService2: function(cb) {
		var config = {
			"serviceName": "example02",
			"servicePort": 4011,
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
				//setTimeout(function() {
					cb();
				//}, 500);
			});
		});
	},

	stopDaemon: function(cb){
		holder.daemon.stop(cb);
	},
	startDaemon: function(cb){
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

		holder.daemon.init(function() {
			holder.daemon.job("hello", function(soajs, next) {
				soajs.log.info ("HELLO daemon");
				next();
			});
			holder.daemon.start(function(err){
				assert.ifError(err);
				setTimeout(function() {
					cb();
				}, 500);
			});
		});
	}
};

describe("testing multi tenancy", function() {
	var auth;

	before(function(done) {
		lib.startUrac(function() {
			lib.startTestService(function() {
				lib.startTestService2(function() {
					lib.startDaemon(function(){
						lib.startController(function() {
							tenantMongo.remove('users', {}, function(error) {
								assert.ifError(error);
								tenantMongo.remove('groups', {}, function(error) {
									assert.ifError(error);
									setTimeout(function(){
										console.log("services started, waiting 6 sec to proceed...");
										done();
									},6000);
								});
							});
						});
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
			"tenant":{
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
		tenantMongo.insert('users', userRecord, function(error, response) {
			assert.ifError(error);
			assert.ok(response);
			var groupRecord = {
				"code": "admin",
				"name": "administrator",
				"description": "admin test group",
				"tenant":{
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
			tenantMongo.insert('groups', groupRecord, function(error, response) {
				assert.ifError(error);
				assert.ok(response);
				done();
			});
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
				assert.ok(!body.result);
				assert.ok(body.errors);
				done();
			});
		});
	});

	describe("additional multi tests", function(){
		it('will add another user to db', function(done) {
			var userRecord = {
				"username": "user10002",
				"password": "$2a$04$yn9yaxQysIeH2VCixdovJ.TLuOEjFjS5D2Otd7sO7uMkzi9bXX1tq",
				"firstName": "User",
				"lastName": "One",
				"email": "user.two@mydomain.com",
				"status": "active",
				"profile": {},
				"tenant":{
					"id": testTenant._id.toString(),
					"code": testTenant.code
				},
				"groups": ['vip', 'admin'],
				"config": {
					"packages": {
						"TPROD_BASIC": { //URACPACKAGE
							"acl": { //URACPACKAGEACL
								"dev":{
									"urac": {},
									"example03": {},
									"example02": {}
								}
							}
						}
					},
					"keys": {
						"695d3456de70fddc9e1e60a6d85b97d3": { //URACKEY
							"config": { //URACKEYCONFIG
								"urac": {}
							},
							"acl": {
								"dev":{
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
				var groupRecord = {
					"code": "admin",
					"name": "administrator",
					"description": "admin test group",
					"tenant":{
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
								"acl": {
									"dev":{
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
				tenantMongo.remove("groups", {"name":"administrator"}, function(error){
					assert.ifError(error);
					tenantMongo.insert('groups', groupRecord, function(error, response) {
						assert.ifError(error);
						assert.ok(response);
						done();
					});
				});
			});
		});

		it("login another user", function(done) {
			requester('post', {
				uri: 'http://localhost:4000/urac/login',
				headers: {
					key: testTenant.applications[1].keys[0].extKeys[0].extKey
				},
				body: {
					'username': 'user10002',
					'password': '123456'
				}
			}, function(err, body) {
				assert.ifError(err);
				assert.ok(body);
				auth = body.soajsauth;
				done();
			});
		});

		it('will add third user to db', function(done) {
			var userRecord = {
				"username": "user10003",
				"password": "$2a$04$yn9yaxQysIeH2VCixdovJ.TLuOEjFjS5D2Otd7sO7uMkzi9bXX1tq",
				"firstName": "User",
				"lastName": "Three",
				"email": "user.three@mydomain.com",
				"status": "active",
				"profile": {},
				"tenant":{
					"id": testTenant._id.toString(),
					"code": testTenant.code
				},
				"groups": ['vip', 'admin'],
				"config": {
					"packages": {
						"TPROD_BASIC": { //URACPACKAGE
							"acl": { //URACPACKAGEACL
								"dev":{
									"urac": {},
									"example03": {},
									"example02": {}
								}
							}
						}
					}
				}
			};
			tenantMongo.insert('users', userRecord, function(error, response) {
				assert.ifError(error);
				assert.ok(response);
				var groupRecord = {
					"code": "admin",
					"name": "administrator",
					"description": "admin test group",
					"tenant":{
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
						}
					}
				};
				tenantMongo.remove("groups", {"name":"administrator"}, function(error){
					assert.ifError(error);
					tenantMongo.insert('groups', groupRecord, function(error, response) {
						assert.ifError(error);
						assert.ok(response);
						done();
					});
				});
			});
		});

		it("login third user", function(done) {
			requester('post', {
				uri: 'http://localhost:4000/urac/login',
				headers: {
					key: testTenant.applications[1].keys[0].extKeys[0].extKey
				},
				body: {
					'username': 'user10003',
					'password': '123456'
				}
			}, function(err, body) {
				assert.ifError(err);
				assert.ok(body);
				auth = body.soajsauth;
				done();
			});
		});

		it('will add fourth user to db', function(done) {
			var userRecord = {
				"username": "user10004",
				"password": "$2a$04$yn9yaxQysIeH2VCixdovJ.TLuOEjFjS5D2Otd7sO7uMkzi9bXX1tq",
				"firstName": "User",
				"lastName": "Three",
				"email": "user.four@mydomain.com",
				"status": "active",
				"profile": {},
				"tenant":{
					"id": testTenant._id.toString(),
					"code": testTenant.code
				},
				"groups": ['vip', 'admin'],
				"config": {}
			};
			tenantMongo.insert('users', userRecord, function(error, response) {
				assert.ifError(error);
				assert.ok(response);
				var groupRecord = {
					"code": "admin",
					"name": "administrator",
					"description": "admin test group",
					"tenant":{
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
								"acl": {
									"dev":{
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
							}
						},
					}
				};
				tenantMongo.remove("groups", {"name":"administrator"}, function(error){
					assert.ifError(error);
					tenantMongo.insert('groups', groupRecord, function(error, response) {
						assert.ifError(error);
						assert.ok(response);
						done();
					});
				});
			});
		});

		it("login fourth user", function(done) {
			requester('post', {
				uri: 'http://localhost:4000/urac/login',
				headers: {
					key: testTenant.applications[1].keys[0].extKeys[0].extKey
				},
				body: {
					'username': 'user10004',
					'password': '123456'
				}
			}, function(err, body) {
				assert.ifError(err);
				assert.ok(body);
				auth = body.soajsauth;
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
				assert.ok(!body.result);
				assert.ok(body.errors);
				done();
			});
		});
	});

	describe("stopping services", function(){
		it("do stop", function(done) {
			async.parallel([
				lib.stopController,
				lib.stopTestService,
				lib.stopTestService2,
				lib.stopUrac,
				lib.stopDaemon
			], function(){
				done();
			});
		});
	});
});