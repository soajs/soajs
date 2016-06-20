'use strict';


module.exports = {
    "init": function () {
    },
    "loadData": function (dbConfiguration, envCode, param, callback) {
        var obj = {};
        return callback(null, obj);
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