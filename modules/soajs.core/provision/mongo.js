'use strict';
var Mongo = require('../../soajs.mongo');
var mongo = null;
var tenantCollectionName = "tenants";
var productsCollectionName = "products";
var tokenCollectionName = "oauth_token";
var daemonGrpConfCollectionName = "daemon_grpconf";

var regEnvironment = (process.env.SOAJS_ENV || "dev");
regEnvironment = regEnvironment.toLowerCase();

module.exports = {
    init: function (dbConfig){
        mongo = new Mongo(dbConfig);
    },
    getOauthToken: function (access_token, cb) {
        mongo.findOne(tokenCollectionName, {"oauthAccessToken.accessToken": access_token}, cb);
    },
    getDaemonGrpConf: function (grp, name, cb) {
        if (grp && name) {
            var criteria = {
                "daemonConfigGroup": grp,
                "daemon": name
            };
            mongo.find(daemonGrpConfCollectionName, criteria, function (err, grpCong) {
                if (err) {
                    return cb(err);
                }
                cb(null, grpCong[0]);
            });
        }
        else
            return cb();
    },
    getPackagesFromDb: function (code, cb) {
        var criteria = {};
        if (code) {
            criteria['packages.code'] = code;
        }

        mongo.find(productsCollectionName, criteria, function (err, products) {
            if (err) {
                return cb(err);
            }
            var struct = null;
            if (products) {
                var prodLen = products.length;
                for (var i = 0; i < prodLen; i++) {
                    if (products[i].packages) {
                        var pckLen = products[i].packages.length;
                        for (var j = 0; j < pckLen; j++) {
                            if (!code || (code && products[i].packages[j].code === code)) {
                                if (!struct) {
                                    struct = {};
                                }

                                var ACL_ALL_ENV = products[i].packages[j].acl;
                                var ACL = ACL_ALL_ENV;
                                if (ACL_ALL_ENV && typeof ACL_ALL_ENV === "object") {
                                    if (ACL_ALL_ENV[regEnvironment] && (!ACL_ALL_ENV[regEnvironment].access && !ACL_ALL_ENV[regEnvironment].apis && !ACL_ALL_ENV[regEnvironment].apisRegExp && !ACL_ALL_ENV[regEnvironment].apisPermission)) {
                                        ACL = ACL_ALL_ENV[regEnvironment];
                                    }
                                }
                                else {
                                    ACL_ALL_ENV = null;
                                    ACL = null;
                                }
                                struct[products[i].packages[j].code] = {
                                    "acl": ACL,
                                    "acl_all_env": ACL_ALL_ENV,
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
    },
    getKeyFromDb: function (key, tId, oauth, cb) {
        var criteria = {};
        if (key) {
            criteria['applications.keys.key'] = key;
        }
        if (tId) {
            criteria['_id'] = mongo.ObjectId(tId);
        }

        mongo.find(tenantCollectionName, criteria, function (err, tenants) {
            if (err) {
                return cb(err);
            }
            var keyStruct = null;
            var oauthStruct = null;
            if (tenants) {
                var tenLen = tenants.length;
                for (var i = 0; i < tenLen; i++) {
                    if (tenants[i].oauth) {
                        if (!oauthStruct) {
                            oauthStruct = {};
                        }
                        oauthStruct[tenants[i]._id.toString()] = tenants[i].oauth;
                    }
                    if (tenants[i].applications) {
                        var appLen = tenants[i].applications.length;
                        for (var j = 0; j < appLen; j++) {
                            if (tenants[i].applications[j].keys) {
                                var keyLen = tenants[i].applications[j].keys.length;
                                for (var k = 0; k < keyLen; k++) {
                                    if (!key || (key && tenants[i].applications[j].keys[k].key === key)) {
                                        if (!keyStruct)
                                            keyStruct = {};

                                        var keyConfig = tenants[i].applications[j].keys[k].config;
                                        if (keyConfig && typeof keyConfig === "object" && keyConfig[regEnvironment])
                                            keyConfig = keyConfig[regEnvironment];
                                        else
                                            keyConfig = {};

                                        var ACL_ALL_ENV = tenants[i].applications[j].acl;
                                        var ACL = ACL_ALL_ENV;
                                        if (ACL_ALL_ENV && typeof ACL_ALL_ENV === "object") {
                                            if (ACL_ALL_ENV[regEnvironment] && (!ACL_ALL_ENV[regEnvironment].access && !ACL_ALL_ENV[regEnvironment].apis && !ACL_ALL_ENV[regEnvironment].apisRegExp && !ACL_ALL_ENV[regEnvironment].apisPermission))
                                                ACL = ACL_ALL_ENV[regEnvironment];
                                        }
                                        else {
                                            ACL_ALL_ENV = null;
                                            ACL = null;
                                        }

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
                                                "acl": ACL,
                                                "acl_all_env": ACL_ALL_ENV
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
            if (oauth) {
                return cb(null, {"keyData": keyStruct, "oauthData": oauthStruct});
            } else {
                return cb(null, keyStruct);
            }
        });
    }
};
