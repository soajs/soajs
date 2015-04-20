"use strict";
var assert = require('assert');
var request = require("request");
var helper = require("../helper.js");
var soajs = helper.requireModule('index.js');

var Mongo = soajs.mongo;
var coreDbConfig = {
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
var coreMongo = new Mongo(coreDbConfig);
var oauthUser = require("soajs.mongodb.data/modules/soajs/data/oauth.js");

var key = "aa39b5490c4a4ed0e56d7ec1232a428f771e8bb83cfcee16de14f735d0f5da587d5968ec4f785e38570902fd24e0b522b46cb171872d1ea038e88328e7d973ff47d9392f72b2d49566209eb88eb60aed8534a965cf30072c39565bd8d72f68ac";
var controller, service, oauth;

var lib = {

	controller: {
		start: function(cb) {
			controller = new soajs.server.controller();
			controller.init(function() {
				controller.start(cb);
			});
		},
		stop: function(cb) {
			controller.stop(cb);
		}
	},
	service: {
		start: function(cb) {
			var config = {
				"serviceName": "example02",
				"errors": {},
				"schema": {
					"/testRoute": {
						"_apiInfo": {
							"l": "Test Route"
						},
						"firstName": {
							"source": ['query.firstName'],
							"required": true,
							"default": "John",
							"validation": {
								"type": "string"
							}
						},
						"lastName": {
							"source": ['query.lastName'],
							"required": true,
							"validation": {
								"type": "string"
							}
						}
					}
				}
			};

			service = new soajs.server.service({
				"oauth": true,
				"session": false,
				"config": config
			});

			service.init(function() {
				service.get("/testRoute", function(req, res) {
					var fullName = req.soajs.inputmaskData.firstName + ' ' + req.soajs.inputmaskData.lastName;
					res.json(req.soajs.buildResponse(null, {fullName: fullName}));
				});

				service.start(function() {
					setTimeout(function() {
						cb();
					}, 500);
				});
			});
		},
		stop: function(cb) {
			service.stop(cb);
		}
	},
	oauth: {
		start: function(cb) {
			var config = {
				"serviceName": "oauth",
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
							"validation": {
								"type": "string"
							}
						},
						"grant_type": {
							"source": ['body.username'],
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

			oauth = new soajs.server.service({
				"oauth": true,
				"security": true,
				"oauthService": {
					"name": config.serviceName,
					"tokenApi": "/token"
				},
				"config": config
			});

			oauth.init(function() {
				var userCollectionName = "oauth_urac";
				var tokenCollectionName = "oauth_token";
				var Hasher = helper.hasher;
				var Mongo = soajs.mongo;
				var mongo = null;

				function login(req, cb) {
					if(!mongo) {
						mongo = new Mongo(req.soajs.registry.coreDB.provision);
					}
					mongo.findOne(userCollectionName, {'userId': req.soajs.inputmaskData['username']}, function(err, record) {
						if(record) {
							var hashConfig = {
								"hashIterations": config.hashIterations,
								"seedLength": config.seedLength
							};
							if(req.soajs.servicesConfig && req.soajs.servicesConfig.oauth) {
								hashConfig = {
									"hashIterations": req.soajs.servicesConfig.oauth.hashIterations || config.hashIterations,
									"seedLength": req.soajs.servicesConfig.oauth.seedLength || config.seedLength
								};
							}

							var hasher = new Hasher(hashConfig);
							hasher.compare(req.soajs.inputmaskData.password, record.password, function(err, result) {
								if(err) {
									return cb(400);
								}

								if(!result) {
									return cb(401);
								}

								delete record.password;
								if(record.tId) {
									if(record.tId.toString() !== req.soajs.tenant.id) {
										return cb(403);
									}
								}
								return cb(null, record);
							});
						}
						else {
							return cb(401);
						}
					});
				}

				oauth.post("/token", function(req, res, next) {
					login(req, function(err, record) {
						if(err) {
							return res.jsonp(req.soajs.buildResponse({"code": err, "msg": config.errors[err]}));
						}
						else {
							var tokenRecord = {};
							if(!mongo) {
								mongo = new Mongo(req.soajs.registry.coreDB.provision);
							}
							oauth.oauth.model["getUser"] = function(username, password, callback) {
								callback(false, {"id": record._id.toString()});
							};
							oauth.oauth.model["saveAccessToken"] = function(accessToken, clientId, expires, userId, callback) {
								tokenRecord.oauthAccessToken = {
									accessToken: accessToken,
									clientId: clientId,
									userId: userId,
									expires: expires
								};
								if(req.soajs.registry.serviceConfig.oauth.grants.indexOf('refresh_token') >= 0) {
									callback(false);
								} else {
									mongo.insert(tokenCollectionName, tokenRecord, function(err, data) {
										callback(false);
									});
								}
							};
							oauth.oauth.model["saveRefreshToken"] = function(refreshToken, clientId, expires, userId, callback) {
								tokenRecord.oauthRefreshToken = {
									refreshToken: refreshToken,
									clientId: clientId,
									userId: userId,
									expires: expires
								};
								mongo.insert(tokenCollectionName, tokenRecord, function(err, data) {
									callback(false);
								});
							};
							return next();
						}
					});
				}, oauth.oauth.grant());

				oauth.start(function() {
					setTimeout(function() {
						cb();
					}, 500);
				});
			});
		},
		stop: function(cb) {
			oauth.stop(cb);
		}
	}
};

describe("testing secured service with oauth", function() {
	before(function(done) {
		lib.oauth.start(function() {
			lib.service.start(function() {
				lib.controller.start(function() {
					coreMongo.remove('oauth_urac', {}, function(error) {
						assert.ifError(error);
						coreMongo.insert('oauth_urac', oauthUser, function(error) {
							assert.ifError(error);
							done();
						});
					});
				});
			});
		});
	});

	after(function(done) {
		lib.controller.stop(function() {
			lib.oauth.stop(function() {
				lib.service.stop(function() {
					done();
				});
			});
		});
	});

	var buildNameParams = {
		uri: 'http://127.0.0.1:4000/example02/testRoute',
		qs: {
			'firstName': 'David',
			'lastName': 'Smith'
		},
		headers: {
			"key": key,
			"Content-type": "application/json",
			'Accept': "application/json"
		}
	};

	it('fail - hitting service api before login will not work.', function(done) {
		helper.requester('get', buildNameParams, function(err, body, req) {
			assert.ifError(err);
			assert.ok(body);
			assert.equal(body.result, false);
			assert.ok(body.errors);
			assert.equal(body.errors.details[0].code, 400);
			assert.equal(body.errors.details[0].message, 'The access token was not found');
			done();
		});

	});

	it('login to oauth - then redirect to service - success', function(done) {
		var oauth = {
			url: 'http://127.0.0.1:4000/oauth/token',
			method: "POST",
			body: 'username=oauthuser&password=oauthpassword&grant_type=password',
			json: true,
			headers: {
				'accept': '*/*',
				'content-type': 'application/x-www-form-urlencoded',
				"Authorization": 'Basic MTBkMmNiNWZjMDRjZTUxZTA2MDAwMDAxOnNoaGggdGhpcyBpcyBhIHNlY3JldA==',
				'key': key
			}
		};

		request(oauth, function(error, response, body) {
			assert.ifError(error);
			assert.ok(body);
			assert.ok(body.access_token);
			buildNameParams.qs.access_token = body.access_token;
			done();
		});
	});

	it('hit service with a valid token', function(done) {
		helper.requester('get', buildNameParams, function(err, body, req) {
			assert.ifError(err);
			assert.ok(body);
			assert.equal(body.result, true);
			assert.ok(body.data);
			assert.deepEqual(body.data, {'fullName': 'David Smith'});
			done();
		});
	});

	it('hit service with an invalid token', function(done) {
		buildNameParams.qs.access_token = "abcdefghijklmnopqr";
		helper.requester('get', buildNameParams, function(err, body, req) {
			assert.ifError(err);
			assert.ok(body);
			assert.equal(body.result, false);
			assert.ok(body.errors);
			done();
		});
	});
});