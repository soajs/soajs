"use strict";

/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */

const request = require('request');

if (!process.env.SOAJS_REGISTRY_API || process.env.SOAJS_REGISTRY_API.indexOf(":") === -1) {
	throw new Error('Invalid format for SOAJS_REGISTRY_API [hostname:port]: ' + process.env.SOAJS_REGISTRY_API);
} else {
	let portFromEnv = process.env.SOAJS_REGISTRY_API.substr(process.env.SOAJS_REGISTRY_API.indexOf(":") + 1);
	let port = parseInt(portFromEnv);
	if (isNaN(port)) {
		throw new Error('port must be integer: [' + portFromEnv + ']');
	}
}

let model = {
	"fetchRegistry": function (param, options, cb) {
		let reg = null;
		
		let requestOption = {
			"url": "http://" + process.env.SOAJS_REGISTRY_API + "/getRegistry?env=" + options.envCode + "&name=" + param.name + "&type=" + param.type + "&setBy=" + options.setBy,
			"json": true
		};
		request(requestOption, function (error, response, body) {
			if (!error) {
				if (body.result) {
					reg = body.data;
				}
			}
			return cb(error, reg);
		});
	}
};

module.exports = model;