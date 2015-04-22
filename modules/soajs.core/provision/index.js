'use strict';
var Mongo = require('../../soajs.mongo');
var mongo = null;
var tenantCollectionName = "tenants";
var productsCollectionName = "products";
var tokenCollectionName = "oauth_token";

var regEnvironment = (process.env.SOAJS_ENV || "dev");
regEnvironment = regEnvironment.toLowerCase();

function getOauthToken(access_token, cb) {
	mongo.findOne(tokenCollectionName, {"oauthAccessToken.accessToken": access_token}, cb);
}

function getPackagesFromDb(code, cb) {
	var criteria = {};
	if(code) {
		criteria['packages.code'] = code;
	}

	mongo.find(productsCollectionName, criteria, function(err, products) {
		if(err) {
			return cb(err);
		}
		var struct = null;
		if(products) {
			var prodLen = products.length;
			for(var i = 0; i < prodLen; i++) {
				if(products[i].packages) {
					var pckLen = products[i].packages.length;
					for(var j = 0; j < pckLen; j++) {
						if(!code || (code && products[i].packages[j].code === code)) {
							if(!struct) {
								struct = {};
							}
							struct[products[i].packages[j].code] = {
								"acl": products[i].packages[j].acl || null,
								"_TTL": products[i].packages[j]._TTL,
								"_TIME": new Date().getTime()
							};
						}
					}
				}
			}
		}
		return cb(null, struct);
	});
}

function getKeyFromDb(key, tId, oauth, cb) {
	var criteria = {};
	if(key) {
		criteria['applications.keys.key'] = key;
	}
	if(tId) {
		criteria['_id'] = mongo.ObjectId(tId);
	}

	mongo.find(tenantCollectionName, criteria, function(err, tenants) {
		if(err) {
			return cb(err);
		}
		var keyStruct = null;
		var oauthStruct = null;
		if(tenants) {
			var tenLen = tenants.length;
			for(var i = 0; i < tenLen; i++) {
				if(tenants[i].oauth) {
					if(!oauthStruct) {
						oauthStruct = {};
					}
					oauthStruct[tenants[i]._id.toString()] = tenants[i].oauth;
				}
				if(tenants[i].applications) {
					var appLen = tenants[i].applications.length;
					for(var j = 0; j < appLen; j++) {
						if(tenants[i].applications[j].keys) {
							var keyLen = tenants[i].applications[j].keys.length;
							for(var k = 0; k < keyLen; k++) {
								if(!key || (key && tenants[i].applications[j].keys[k].key === key)) {
									if(!keyStruct)
										keyStruct = {};

                                    var keyConfig = tenants[i].applications[j].keys[k].config;
                                    if (keyConfig && typeof keyConfig === "object" && keyConfig[regEnvironment])
                                        keyConfig = keyConfig[regEnvironment];
                                    else
                                        keyConfig = {};

									keyStruct[tenants[i].applications[j].keys[k].key] = {
										"key": tenants[i].applications[j].keys[k].key,
										"tenant": {
											"id": tenants[i]._id.toString(),
											"code": tenants[i].code
										},
										"application": {
											"product": tenants[i].applications[j].product,
											"package": tenants[i].applications[j].package,
											"appId": tenants[i].applications[j].appId.toString(),
											"acl": tenants[i].applications[j].acl || null
										},
										"extKeys": tenants[i].applications[j].keys[k].extKeys,
										"config": keyConfig,
										"_TTL": tenants[i].applications[j]._TTL,
										"_TIME": new Date().getTime()
									};
								}
							}
						}
					}
				}
			}
		}
		if(oauth) {
			return cb(null, {"keyData": keyStruct, "oauthData": oauthStruct});
		} else {
			return cb(null, keyStruct);
		}
	});
}

var provision = {
	"init": function(dbConfig) {
		mongo = new Mongo(dbConfig);
	},
	"getOauthToken": function(access_token, cb) {
		return getOauthToken(access_token, cb);
	},
	"getPackages": function(cb) {
		return getPackagesFromDb(null, cb);
	},
	"getKeysOauths": function(cb) {
		return getKeyFromDb(null, null, true, cb);
	},
	"getKeys": function(cb) {
		return getKeyFromDb(null, null, false, cb);
	},
	"getKey": function(key, cb) {
		return getKeyFromDb(key, null, false, function(err, data) {
			if(err || !(data && data[key])) {
				return cb(err);
			}
			return cb(null, data[key]);
		});
	},
	"getPackage": function(code, cb) {
		return getPackagesFromDb(code, function(err, data) {
			if(err || !(data && data[code])) {
				return cb(err);
			}
			return cb(null, data[code]);
		});
	},
	"getTenantKeys": function(tId, cb) {
		return getKeyFromDb(null, tId, false, cb);
	}
};

module.exports = provision;