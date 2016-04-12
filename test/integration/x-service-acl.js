"use strict";
var assert = require("assert");
var helper = require("../helper.js");
var async = require("async");

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
			"session": true,
			"awareness": true,
			"roaming": true,
			"awarenessEnv": true,
			"requestTimeout": 2,
			"requestTimeoutRenewal": 2,
			"serviceVersion": 1,
			"serviceName": "urac",
			"serviceGroup": "uracGroup",
			"servicePort": 4001,
			"extKeyRequired": true,
			"errors": {
				"401": "error logging in try again"
			},
			"schema": {
				"/logout": {
					"_apiInfo": {
						"l": "Logout",
						"group": "Urac"
					}
				},
				"/info": {
					"_apiInfo": {
						"l": "Information",
						"group": "Urac"
					}
				},
				"/login": {
					"_apiInfo": {
						"l": "Login",
						"group": "Urac",
						"groupMain": true
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

		holder.urac = new soajs.server.service(config);

		holder.urac.init(function() {
			holder.urac.get("/logout", function(req, res) {
				req.soajs.session.clearURAC(function(err) {
					res.json(req.soajs.buildResponse(err, true));
				});
			});

			holder.urac.get("/info", function(req, res) {
				var user = req.soajs.session.getUrac();
				req.soajs.awarenessEnv.getHost(process.env.SOAJS_ENV, function (host) {
					console.log(host);
					console.log('************')
					res.json(req.soajs.buildResponse(null, user));
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

						return res.jsonp(req.soajs.buildResponse(null, record));
					});
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

	startTestService: function(cb){
		var config = {
			"session": true,
			"roaming": true,
			"awarenessEnv": true,
			"serviceVersion": 1,
			"requestTimeout": 2,
			"requestTimeoutRenewal": 2,
			"serviceName": "example03",
			"servicePort": 4012,
			"serviceGroup": "exampleGroup",
			"extKeyRequired": true,
			"errors": {
				"401": "error logging in try again"
			},
			"schema": {
				"/info": {
					"_apiInfo": {
						"l": "Information",
						"group": "Urac"
					}
				}
			}
		};

		holder.service = new soajs.server.service(config);

		holder.service.init(function() {

			holder.service.get("/info", function(req, res) {
				var user = req.soajs.session.getUrac();
				var soajsCore = require("soajs/modules/soajs.core");
				soajsCore.registry.loadByEnv({
					"envCode": process.env.SOAJS_ENV
				}, function (err, reg) {

					req.soajs.roaming.roamEnv(process.env.SOAJS_ENV, {}, function(error, env){
						req.soajs.roaming.roamExtKey(req.headers.key, {}, function(error, key) {
							return res.json(req.soajs.buildResponse(null, {"reg": reg, "env": env, "key": key}));
						});
					});
				});
			});

			holder.service.get("/info2", function(req, res) {
				var user = req.soajs.session.getUrac();
				return res.json(req.soajs.buildResponse(null, user));
			});

			holder.service.start(cb);
		});
	},
	stopTestService: function(cb){
		holder.service.stop(cb);
	}
};

describe("testing multi tenancy", function() {
	var auth;

	before(function (done) {
		lib.startUrac(function () {
			lib.startTestService(function () {
				// lib.startTestService2(function () {
					lib.startController(function () {
						tenantMongo.remove('users', {}, function (error) {
							assert.ifError(error);
							tenantMongo.remove('groups', {}, function (error) {
								assert.ifError(error);
								setTimeout(function(){

									requester('get', {
										uri: 'http://localhost:5000/reloadRegistry',
										headers: {

										}
									}, function(err, body) {
										assert.ifError(err);
										assert.ok(body);
										done();
									});

								}, 5000);
							});
						});
					});
				// });
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
			"groups": ['admin'],
			"config": {
				"packages": {
					"TPROD_BASIC": {
						"acl": {
							"dev":{
								"urac": {
									"apisPermission": "restricted",
									"access": false,
									"apis":{
										"/logout": {
											"access": true
										}
									},
									"apisRegExp": [
										{
											"regExp": /^\/info/ ,
											"access": true
										}
									]
								},
								"example03": {
									"access": ['owner']
								}
							}
						}
					}
				}
			}
		};
		tenantMongo.insert('users', userRecord, function (error, response) {
			assert.ifError(error);
			assert.ok(response);
			tenantMongo.remove("groups",{}, function(error){
				assert.ifError(error);
				done();
			});
		});
	});

	it("reload Provisioning", function(done){
		requester('get', {
			uri: 'http://localhost:5001/loadProvision',
			headers: {

			}
		}, function(err, body) {
			assert.ifError(err);
			assert.ok(body);
			done();
		});
	});

	it("login user", function (done) {
		requester('post', {
			uri: 'http://localhost:4000/urac/login',
			headers: {
				key: testTenant.applications[0].keys[0].extKeys[0].extKey
			},
			body: {
				'username': 'user10001',
				'password': '123456'
			}
		}, function (err, body) {
			assert.ifError(err);
			assert.ok(body);
			auth = body.soajsauth;
			done();
		});
	});

	it("call info api", function(done){
		requester('get', {
			uri: 'http://localhost:4000/urac/info',
			headers: {
				key: testTenant.applications[0].keys[0].extKeys[0].extKey,
				soajsauth: auth
			}
		}, function(err, body) {
			assert.ifError(err);
			assert.ok(body);
			assert.ok(body.data);
			done();
		});
	});

	it("call info2 api another user", function(done){
		requester('get', {
			uri: 'http://localhost:4000/example03/info2',
			headers: {
				key: testTenant.applications[0].keys[0].extKeys[0].extKey,
				soajsauth: auth
			}
		}, function(err, body) {
			assert.ifError(err);
			assert.ok(body);
			assert.ok(body.errors);
			done();
		});
	});

	//
	// it('will add another user to db', function (done) {
	// 	var userRecord = {
	// 		"username": "user10002",
	// 		"password": "$2a$04$yn9yaxQysIeH2VCixdovJ.TLuOEjFjS5D2Otd7sO7uMkzi9bXX1tq",
	// 		"firstName": "User",
	// 		"lastName": "One",
	// 		"email": "user.two@mydomain.com",
	// 		"status": "active",
	// 		"profile": {},
	// 		"tenant": {
	// 			"id": testTenant._id.toString(),
	// 			"code": testTenant.code
	// 		},
	// 		"groups": ['admin'],
	// 		"config": {}
	// 	};
	// 	tenantMongo.insert('users', userRecord, function (error, response) {
	// 		assert.ifError(error);
	// 		assert.ok(response);
	// 		var groupRecord = {
	// 			"code": "admin",
	// 			"name": "administrator",
	// 			"description": "admin test group",
	// 			"tenant":{
	// 				"id": testTenant._id.toString(),
	// 				"code": testTenant.code
	// 			},
	// 			"config": {
	// 				"packages": {
	// 					"TPROD_BASI2": {
	// 						"acl": {
	// 							"dev":{
	// 								"example03": {
	// 									"access": ['admin'],
	// 									"apis":{
	// 										"/info2":{
	// 											"access":["owner"]
	// 										}
	// 									}
	// 								}
	// 							}
	// 						}
	// 					}
	// 				}
	// 			}
	// 		};
	// 		tenantMongo.remove("groups", {"name":"administrator"}, function(error) {
	// 			assert.ifError(error);
	// 			tenantMongo.insert('groups', groupRecord, function (error, response) {
	// 				assert.ifError(error);
	// 				done();
	// 			});
	// 		});
	// 	});
	// });
	//
	// it("reload Provisioning", function(done){
	// 	requester('get', {
	// 		uri: 'http://localhost:5001/loadProvision',
	// 		headers: {
	//
	// 		}
	// 	}, function(err, body) {
	// 		assert.ifError(err);
	// 		assert.ok(body);
	// 		requester('get', {
	// 			uri: 'http://localhost:5012/loadProvision',
	// 			headers: {
	//
	// 			}
	// 		}, function(err, body) {
	// 			assert.ifError(err);
	// 			assert.ok(body);
	// 			done();
	// 		});
	// 	});
	// });
	//
	// it("login another user", function (done) {
	// 	requester('post', {
	// 		uri: 'http://localhost:4000/urac/login',
	// 		headers: {
	// 			key: testTenant.applications[3].keys[0].extKeys[0].extKey
	// 		},
	// 		body: {
	// 			'username': 'user10002',
	// 			'password': '123456'
	// 		}
	// 	}, function (err, body) {
	// 		assert.ifError(err);
	// 		assert.ok(body);
	// 		auth = body.soajsauth;
	// 		done();
	// 	});
	// });
	//
	// it("call info api another user", function(done){
	// 	requester('get', {
	// 		uri: 'http://localhost:4000/example03/info',
	// 		headers: {
	// 			key: testTenant.applications[3].keys[0].extKeys[0].extKey,
	// 			soajsauth: auth
	// 		}
	// 	}, function(err, body) {
	// 		assert.ifError(err);
	// 		assert.ok(body);
	// 		assert.ok(body.data);
	// 		done();
	// 	});
	// });
	//
	// it("call info2 api another user", function(done){
	// 	requester('get', {
	// 		uri: 'http://localhost:4000/example03/info2',
	// 		headers: {
	// 			key: testTenant.applications[3].keys[0].extKeys[0].extKey,
	// 			soajsauth: auth
	// 		}
	// 	}, function(err, body) {
	// 		assert.ifError(err);
	// 		assert.ok(body);
	// 		assert.ok(body.errors);
	// 		done();
	// 	});
	// });

	describe("stopping services", function(){
		it("do stop", function(done) {
			async.parallel([
				lib.stopController,
				lib.stopTestService,
				lib.stopUrac
			], function(){
				done();
			});
		});
	});
});