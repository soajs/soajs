'use strict';

require("./classes/http");
var coreModules = require ("soajs.core.modules");
var coreLibs = require ("soajs.core.libs");
var coreDrivers = require ("soajs.core.drivers");

process.on('uncaughtException', function (e) {
    console.log(new Date().toISOString(), e.stack || e);
    process.exit(1);
});

/**
 *
 * @type {{mw: {soajs: exports, response: exports, rm: exports, inputmask: exports}, restServer: (service|exports), rmServer: (controller|exports)}}
 */
module.exports = {
    "server": {
        "service": require("./servers/service.js"),
        "controller": require("./servers/controller.js"),
        "daemon": require("./servers/daemon.js")
    },
    "es": coreModules.es,
    "mail": coreModules.mail,
    "mongo": coreModules.mongo,
    "hasher": coreModules.hasher,
    "core": coreModules.core,
    "authorization": coreModules.authorization,
    "provision": coreModules.provision,
    "utils": coreLibs.utils,
    "drivers": coreDrivers
};

