'use strict';
var dServers = require("../configurations/servers");
var dOptions = require("../configurations/options");


var registry = {
	"name": "dev",
	"version": "0.0",
	"environment": "develop", // develop || production

	"coreDB": {
		"provision": {
			"name": "core_provision",
			"prefix": dServers.prefix,
			"servers": dServers.servers,
			"credentials": dServers.credentials,
			"URLParam": dOptions.URLParam,
			"extraParam": dOptions.extraParam
		}
	}
};

module.exports = registry;
