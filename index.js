'use strict';

require("./classes/http");

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
    "mail": require("./modules/soajs.mail"),
    "mongo": require("./modules/soajs.mongo"),
    "es": require("./modules/soajs.es"),
    "contentBuilder": require("./modules/soajs.contentBuilder"),
    "hasher": require("./modules/soajs.core").security.hasher,
    "authorization": {
        "generate": require("./modules/soajs.core").security.authorization.generate
    }
};

