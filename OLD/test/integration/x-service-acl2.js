"use strict";
var assert = require("assert");
var helper = require("../helper.js");
var async = require("async");

var soajs = helper.requireModule('index.js');

var Mongo = soajs.mongo;
var requester = helper.requester;

var coreDBConfig = {
	"name": 'core_provision',
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
var coreMongo = new Mongo(coreDBConfig);

var testTenant = require("soajs.mongodb.data/modules/soajs/data/tenant.js");

var holder = {
	controller: null,
	oauth: null,
	service: null
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
			var Hasher = helper.hasher;

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
				coreMongo.findOne("oauth_users", {'userId': req.soajs.inputmaskData['username']}, function (err, record) {
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
                            if (record) {
                                record.loginMode = "oauth";
                            }
                            return callback(false, record);
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

	startTestService: function(cb){
		var config = {
			"oauth": true,
			"roaming": true,
			"swagger": true,
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
				return res.json(req.soajs.buildResponse(null, true));
			});

			holder.service.start(cb);
		});
	},
	stopTestService: function(cb){
		holder.service.stop(cb);
	}
};

describe("testing multi tenancy - oauth", function() {
	var auth;

	before(function (done) {
		lib.startOauth(function () {
			lib.startTestService(function () {
				lib.startController(function () {
					done();
				});
			});
		});
	});
	
	after(function(done) {
		async.parallel([
			lib.stopController,
			lib.stopTestService,
			lib.stopOauth
		], function(){
			setTimeout(function(){
				done();
			}, 500);
		});
	});
	
	beforeEach(function(done){
		requester('get', {
			uri: 'http://localhost:5012/loadProvision',
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
			uri: 'http://localhost:4000/oauth/token',
			headers: {
				'accept': '*/*',
				'content-type': 'application/x-www-form-urlencoded',
				"Authorization": 'Basic MTBkMmNiNWZjMDRjZTUxZTA2MDAwMDAxOnNoaGggdGhpcyBpcyBhIHNlY3JldA==',
				key: testTenant.applications[3].keys[0].extKeys[0].extKey
			},
			body: 'username=oauthuser&password=oauthpassword&grant_type=password',
			json: true
		}, function (err, body) {
			assert.ifError(err);
			assert.ok(body);
			auth = body.access_token;
			done();
		});
	});
	
	it("change tenant ACL configuration", function(done){
		coreMongo.findOne("tenants", {}, function(error, tenant){
			assert.ifError(error);
			assert.ok(tenant);
			
			tenant.applications[3].acl ={
				"urac": {},
				"example03":{
					"access": true,
					"get":{
						"apis":{
							"/info":{
								"access":["owner"]
							}
						}
					}
				}
			};
			
			coreMongo.save('tenants', tenant, function(error){
				assert.ifError(error);
				done();
			});
		});
	});

	it("call api", function(done){
		requester('get', {
			uri: 'http://localhost:4000/example03/info',
			headers: {
				key: testTenant.applications[3].keys[0].extKeys[0].extKey
			},
			qs:{
				access_token: auth
			}
		}, function(err, body) {
			assert.ifError(err);
			assert.ok(body);
			// console.log(JSON.stringify(body, null, 2));
			done();
		});
	});
	
	it("change tenant ACL configuration", function(done){
		coreMongo.findOne("tenants", {}, function(error, tenant){
			assert.ifError(error);
			assert.ok(tenant);
			
			tenant.applications[3].acl ={
				"urac": {},
				"example03":{
					"access": true,
					"get":{
						"apis":{
							"/info":{
								"access":false
							}
						}
					}
				}
			};
			
			coreMongo.save('tenants', tenant, function(error){
				assert.ifError(error);
				done();
			});
		});
	});
	
	it("call api", function(done){
		requester('get', {
			uri: 'http://localhost:4000/example03/info',
			headers: {
				key: testTenant.applications[3].keys[0].extKeys[0].extKey
			},
			qs:{
				access_token: auth
			}
		}, function(err, body) {
			assert.ifError(err);
			assert.ok(body);
			// console.log(JSON.stringify(body, null, 2));
			done();
		});
	});
	
	it("change tenant ACL configuration", function(done){
		coreMongo.findOne("tenants", {}, function(error, tenant){
			assert.ifError(error);
			assert.ok(tenant);
			
			tenant.applications[3].acl ={
				"urac": {},
				"example03":{
					"access": false,
					"get":{
						"apis":{
							"/info":{
								"access":false
							}
						}
					}
				}
			};
			
			coreMongo.save('tenants', tenant, function(error){
				assert.ifError(error);
				done();
			});
		});
	});
	
	it("call api", function(done){
		requester('get', {
			uri: 'http://localhost:4000/example03/info',
			headers: {
				key: testTenant.applications[3].keys[0].extKeys[0].extKey
			},
			qs:{
				access_token: auth
			}
		}, function(err, body) {
			assert.ifError(err);
			assert.ok(body);
			// console.log(JSON.stringify(body, null, 2));
			done();
		});
	});
	
	it("change tenant ACL configuration", function(done){
		coreMongo.findOne("tenants", {}, function(error, tenant){
			assert.ifError(error);
			assert.ok(tenant);
			
			tenant.applications[3].acl ={
				"urac": {},
				"example03":{
					"apisPermission": "restricted",
					"access": false,
					"get":{
						"apis":{
							"/info":{
								"access":false
							}
						}
					}
				}
			};
			
			coreMongo.save('tenants', tenant, function(error){
				assert.ifError(error);
				done();
			});
		});
	});
	
	it("call api", function(done){
		requester('get', {
			uri: 'http://localhost:4000/example03/info',
			headers: {
				key: testTenant.applications[3].keys[0].extKeys[0].extKey
			},
			qs:{
				access_token: auth
			}
		}, function(err, body) {
			assert.ifError(err);
			assert.ok(body);
			// console.log(JSON.stringify(body, null, 2));
			done();
		});
	});
	
	it("change tenant ACL configuration", function(done){
		coreMongo.findOne("tenants", {}, function(error, tenant){
			assert.ifError(error);
			assert.ok(tenant);
			
			tenant.applications[3].acl ={
				"urac": {},
				"example03":{
					"access": false,
					"get":{
						"apisPermission": "restricted",
						"apis":{
							"/info":{
								"access":false
							}
						}
					}
				}
			};
			
			coreMongo.save('tenants', tenant, function(error){
				assert.ifError(error);
				done();
			});
		});
	});
	
	it("call api", function(done){
		requester('get', {
			uri: 'http://localhost:4000/example03/info',
			headers: {
				key: testTenant.applications[3].keys[0].extKeys[0].extKey
			},
			qs:{
				access_token: auth
			}
		}, function(err, body) {
			assert.ifError(err);
			assert.ok(body);
			// console.log(JSON.stringify(body, null, 2));
			done();
		});
	});
	
	it("change tenant ACL configuration", function(done){
		coreMongo.findOne("tenants", {}, function(error, tenant){
			assert.ifError(error);
			assert.ok(tenant);
			
			tenant.applications[3].acl ={
				"urac": {},
				"example03":{
					"access": false,
					"get":{
						"apisPermission": "restricted",
						"apisRegExp":{
							"/info*":{
								"access":false
							}
						}
					}
				}
			};
			
			coreMongo.save('tenants', tenant, function(error){
				assert.ifError(error);
				done();
			});
		});
	});
	
	it("call api", function(done){
		requester('get', {
			uri: 'http://localhost:4000/example03/info',
			headers: {
				key: testTenant.applications[3].keys[0].extKeys[0].extKey
			},
			qs:{
				access_token: auth
			}
		}, function(err, body) {
			assert.ifError(err);
			assert.ok(body);
			// console.log(JSON.stringify(body, null, 2));
			done();
		});
	});
});