'use strict';

require("./classes/http");

/**
 *
 * @type {{mw: {soajs: exports, response: exports, rm: exports, inputmask: exports}, restServer: (service|exports), rmServer: (controller|exports)}}
 */
module.exports = {
	"server": {
		"service": require("./servers/service.js"),
		"controller": require("./servers/controller.js")
	},
	"mail": require("./modules/soajs.mail"),
	"mongo": require("./modules/soajs.mongo"),
    "contentBuilder": require("./modules/soajs.contentBuilder")
};

