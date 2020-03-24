'use strict';

require("./classes/http");
const coreModules = require("soajs.core.modules");
const coreLibs = require("soajs.core.libs");

process.on('uncaughtException', (e) => {
	console.log(new Date().toISOString(), e.stack || e);
	process.exit(1);
});

/**
 *
 * @type {{mw: {soajs: exports, response: exports, rm: exports, inputmask: exports}, restServer: (service|exports), rmServer: (controller|exports)}}
 */
module.exports = {
	"server": {
		"service": require("./servers/service.js")
	},
	"es": coreModules.es,
	"mail": coreModules.mail,
	"mongo": coreModules.mongo,
	"hasher": coreModules.hasher,
	"core": coreModules.core,
	"authorization": coreModules.authorization,
	"provision": coreModules.provision,
	"utils": coreLibs.utils
};

