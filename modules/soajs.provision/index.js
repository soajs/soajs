'use strict';

var core = require("../soajs.core");
var log = null;

var struct_oauths = {};
var struct_keys = {};
var struct_packages = {};
var struct_tenants = {};

/**
 *
 * @param keyStruct
 * @param extKey
 * @returns {*}
 */
function getKeyData(keyStruct, extKey) {
    var obj = null;
    if (keyStruct && keyStruct.extKeys) {
        var extKeysLen = keyStruct.extKeys.length;
        for (var i = 0; i < extKeysLen; i++) {
            if (keyStruct.extKeys[i].extKey === extKey) {
                if (!keyStruct.extKeys[i].expDate || (keyStruct.extKeys[i].expDate && (keyStruct.extKeys[i].expDate > new Date().getTime()))) {
                    obj = {
                        "key": keyStruct.key,
                        "extKey": extKey,
                        "tenant": {
                            "id": keyStruct.tenant.id,
                            "code": keyStruct.tenant.code
                        },
                        "application": {
                            "product": keyStruct.application.product,
                            "package": keyStruct.application.package,
                            "appId": keyStruct.application.appId,
                            "acl": keyStruct.application.acl,
                            "acl_all_env": keyStruct.application.acl_all_env
                        },
                        "device": keyStruct.extKeys[i].device,
                        "geo": keyStruct.extKeys[i].geo,
                        "config": keyStruct.config
                    };
                }
            }
        }
    }
    return obj;
}

//TODO: must clone key and package object before returning them in the below methods
/**
 *
 * @type {{init: "init", getExternalKeyData: "getExternalKeyData", getPackageData: "getPackageData", loadProvision: "loadProvision", getTenantKeys: "getTenantKeys", generateExtKey: "generateExtKey"}}
 */
var provision = {
    "init": function (dbConfig, logger) {
        log = logger;
        core.provision.init(dbConfig);
    },
    "getExternalKeyData": function (extKey, keyConfig, cb) {
        if (!extKey)
            return cb(core.error.generate(200));

        core.key.getInfo(extKey, keyConfig, function (err, keyObj) {
            if (err)
                return cb(err);

            if (struct_keys[keyObj.key] && (!struct_keys[keyObj.key]._TTL || (struct_keys[keyObj.key]._TTL && struct_keys[keyObj.key]._TIME && (struct_keys[keyObj.key]._TIME > (new Date().getTime() - struct_keys[keyObj.key]._TTL))))) {
                var obj = getKeyData(struct_keys[keyObj.key], extKey);
                if (obj) {
                    return cb(null, obj);
                }
            }
            core.provision.getKey(keyObj.key, function (err, key) {
                if (err)
                    return cb(err, null);
                if (!key)
                    return cb(core.error.generate(153));

                struct_keys[keyObj.key] = key;
                var obj = getKeyData(struct_keys[keyObj.key], extKey);
                return cb(null, obj);
            });
        });
    },
    "getTenantData" : function (tId, cb){
        if (!tId)
            return cb(core.error.generate(205));
        if (struct_tenants[tId])
            return cb (null,struct_tenants[tId]);

        core.provision.getTenantData(tId, function (err, tenant) {
            if (err)
                return cb(err);
            if (!tenant)
                return cb(core.error.generate(206));
            struct_tenants[tId] = tenant;
            return cb(null, tenant);
        });
    },
    "getPackageData": function (code, cb) {
        if (!code)
            return cb(core.error.generate(201));

        if (struct_packages[code] && (!struct_packages[code]._TTL || (struct_packages[code]._TTL && struct_packages[code]._TIME && (struct_packages[code]._TIME > (new Date().getTime() - struct_packages[code]._TTL)))))
            return cb(null, struct_packages[code]);

        core.provision.getPackage(code, function (err, pack) {
            if (err)
                return cb(err);

            struct_packages[code] = pack;
            return cb(null, pack);
        });
    },
    "loadProvision": function (cb) {

        core.provision.getPackages(function (err, packs) {
            if (err) {
                log.error("unable to load all packages from provision: ", err);
                return cb(false);
            }
            else {
                struct_packages = packs;
                core.provision.getKeysOauths(function (err, keysOauths) {
                    if (err) {
                        log.error("unable to load all keys from provision: ", err);
                        return cb(false);
                    }
                    else {
                        if (keysOauths) {
                            struct_keys = keysOauths.keyData;
                            struct_oauths = keysOauths.oauthData;
                            struct_tenants = keysOauths.tenantData;
                        }
                        cb(true);
                    }
                });
            }
        });

        //NOTE: for now we just do the callback. we should use async parallel
        //return cb(true);
    },
    "loadDaemonGrpConf": function (grp, name, cb) {
        if (grp && name) {
            core.provision.getDaemonGrpConf(grp, name, function (err, grpConf) {
                if (err) {
                    log.error("unable to load daemon group config for daemon [" + name + "] and group [" + grp + "] : ", err);
                    return cb(false);
                }
                return cb(null, grpConf);
            });
        }
        else {
            log.error("unable to load daemon group config for daemon [" + name + "] and group [" + grp + "]");
            return cb(false, null);
        }
    },/*
    "getTenantKeys": function (tId, cb) {
        core.provision.getTenantKeys(tId, function (err, data) {
            if (err) {
                log.error(err);
                return cb(core.error.generate(202));
            }
            return cb(null, data);
        });
    },*/
    "generateInternalKey": function (cb) {
        core.key.generateInternalKey(function (err, intKey) {
            if (err) {
                log.error(err);
                return cb(core.error.generate(204));
            }
            return cb(null, intKey);
        });
    },
    "generateExtKey": function (key, keyConfig, cb) {
        if (!key) {
            var err = core.error.generate(203);
            log.error(err);
            return cb(err);
        }
        core.provision.getKey(key, function (err, data) {
            if (err || !data) {
                log.error(err);
                return cb(core.error.generate(203));
            }
            core.key.generateExternalKey(key, data.tenant, data.application, keyConfig, function (err, extKey) {
                if (err) {
                    log.error(err);
                    return cb(core.error.generate(203));
                }
                return cb(null, extKey);
            });
        });
    },
    "oauthModel": {
        "getClient": function (clientId, clientSecret, cb) {
            if (struct_oauths[clientId]) {
                if (clientSecret === null || struct_oauths[clientId].secret === clientSecret)
                    return cb(false, {"clientId": clientId});
            }
            return cb(false, false);
        },
        "grantTypeAllowed": function (clientId, grantType, cb) {
            if (struct_oauths[clientId] && struct_oauths[clientId].grants && (struct_oauths[clientId].grants.indexOf(grantType) >= 0))
                return cb(false, true);
            else
                return cb(false, false);
        },
        "getAccessToken": function (bearerToken, cb) {
            core.provision.getAccessToken(bearerToken, cb);
        },
        "getRefreshToken": function (bearerToken, cb) {
            core.provision.getRefreshToken(bearerToken, cb);
        },
        "saveAccessToken": function (accessToken, clientId, expires, userId, cb) {
            core.provision.saveAccessToken(accessToken, clientId, expires, userId, cb);
        },
        "saveRefreshToken": function (refreshToken, clientId, expires, userId, cb) {
            core.provision.saveRefreshToken(refreshToken, clientId, expires, userId, cb);
        },
        "getUser": function (username, password, callback) {
            callback(false, false);
        }
    }
};

module.exports = provision;