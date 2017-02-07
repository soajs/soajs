'use strict';
var models = {};

var provision = {
    "model": null,
    "init": function (dbConfig) {
        var modelName = "mongo";
        if (process.env.SOAJS_SOLO && process.env.SOAJS_SOLO === "true") {
            models.local = require("./local.js");
            modelName = "local";
        }
        else {
            models.mongo = require("./mongo.js");
            modelName = "mongo";
        }
        models[modelName].init(dbConfig);
        provision.model = models[modelName];
    },
    "getAccessToken": function (bearerToken, cb) {
        return provision.model.getAccessToken(bearerToken, cb);
    },
    "getRefreshToken": function (bearerToken, cb) {
        return provision.model.getRefreshToken(bearerToken, cb);
    },
    "saveAccessToken": function (accessToken, clientId, expires, userId, cb) {
        return provision.model.saveAccessToken(accessToken, clientId, expires, userId, cb);
    },
    "saveRefreshToken": function (refreshToken, clientId, expires, userId, cb) {
        return provision.model.saveRefreshToken(refreshToken, clientId, expires, userId, cb);
    },

    "getPackages": function (cb) {
        return provision.model.getPackagesFromDb(null, cb);
    },
    "getKeysOauths": function (cb) {
        return provision.model.getKeyFromDb(null, null, true, cb);
    },
    "getKeys": function (cb) {
        return provision.model.getKeyFromDb(null, null, false, cb);
    },
    "getKey": function (key, cb) {
        return provision.model.getKeyFromDb(key, null, false, function (err, data) {
            if (err || !(data && data[key])) {
                return cb(err);
            }
            return cb(null, data[key]);
        });
    },
    "getTenant": function (tId, cb) {
        return provision.model.getKeyFromDb(null, tId, true, function (err, data) {
            if (err || !(data && data[tenantData] && data[tenantData][tId])) {
                return cb(err);
            }
            return cb(null, data[tenantData][tId]);
        });
    },
    "getPackage": function (code, cb) {
        return provision.model.getPackagesFromDb(code, function (err, data) {
            if (err || !(data && data[code])) {
                return cb(err);
            }
            return cb(null, data[code]);
        });
    },/*
    "getTenantKeys": function (tId, cb) {
        return provision.model.getKeyFromDb(null, tId, false, cb);
    },*/
    "getDaemonGrpConf": function (grp, name, cb) {
        return provision.model.getDaemonGrpConf(grp, name, cb);
    }
};

module.exports = provision;