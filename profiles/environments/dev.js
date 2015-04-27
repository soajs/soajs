'use strict';

var registry = {
	"name": "dev",
	"version": "0.0",
	"environment": "develop", // develop || production

	"provisionDB": {
		"name": "core_provision",
		"prefix": "",
		"servers": [
			{
				"host": "127.0.0.1",
				"port": 27017
			}
		],
		"credentials": null,
		"URLParam": {
			"connectTimeoutMS": 0,
			"socketTimeoutMS": 0,
			"maxPoolSize": 5,
			"wtimeoutMS": 0,
			"slaveOk": true
		},
		"extraParam": {
			"db": {
				"native_parser": true
			},
			"server": {
				"auto_reconnect": true
			}
		}
	}
};

module.exports = registry;
