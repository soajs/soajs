'use strict';

require("./classes/http");
var coreModules = require ("soajs.core.modules");

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
    "contentBuilder": coreModules.contentBuilder,
    "es": coreModules.es,
    "mail": coreModules.mail,
    "mongo": coreModules.mongo,
    "hasher": coreModules.hasher,
    "authorization": coreModules.authorization
};

