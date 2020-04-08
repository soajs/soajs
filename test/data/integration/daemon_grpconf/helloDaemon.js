'use strict';
module.exports = {
	"daemonConfigGroup": "group1",
	"daemon": "hellodaemon",
	"status": 1,
	"interval": 1800000,
	"jobs": {
		"hello": {
			"type": "global", // "tenant" || "global"
			"serviceConfig": {"tony": "hage"}, //if global
			"tenantExtKeys": [] //if tenant
		}
	}
};