'use strict';
var fs = require('fs');
var regFile = (process.env.SOAJS_PROFILE || __dirname + "/../../../profiles/solo.js");

module.exports = {
    "init": function () {
    },
    "loadData": function (dbConfiguration, envCode, param, callback) {
        var error;
        if (fs.existsSync(regFile)) {
            delete require.cache[require.resolve(regFile)];
            var regFileObj = require(regFile);
            if (regFileObj && typeof regFileObj === 'object' && !(Object.keys(regFileObj).length === 0 && regFileObj.constructor === Object)) {
                var obj = {};
                obj['ENV_schema'] = regFileObj;
                return callback(null, obj);
            }
            else {
                error = new Error('Invalid profile file: ' + regFile);
                throw error;
            }
        }
        else {
            error = new Error('Invalid profile path: ' + regFile);
            throw error;
        }
        return callback(error, null);
    },
    "registerNewService": function (dbConfiguration, serviceObj, collection, cb) {
        return cb(null);
    },
    "addUpdateServiceIP": function (dbConfiguration, hostObj, cb) {
        return cb(null, true);
    },
    "loadRegistryByEnv": function (param, cb) {
        var obj = {};
        return cb(null, obj);
    },
    "loadOtherEnvHosts": function (param, cb) {
        var obj = {};
        return cb(null, obj);
    },
    "loadProfile": function (envFrom) {
        var regFileObj = {};
        var registry = {
            "timeLoaded": new Date().getTime(),
            "name": envFrom,
            "environment": envFrom,
            "profileOnly": true,
            "coreDB": {
                "provision": regFileObj
            }
        };
        return registry;
    }
};