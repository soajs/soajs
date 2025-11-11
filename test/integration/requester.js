/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */

"use strict";

const assert = require('assert');
const axios = require("axios");

let extKey = '3d90163cf9d6b3076ad26aa5ed58556348069258e5c6c941ee0f18448b570ad1c5c790e2d2a1989680c55f4904e2005ff5f8e71606e4aa641e67882f4210ebbc5460ff305dcb36e6ec2a2299cf0448ef60b9e38f41950ec251c1cf41f05f3ce9';
let accessToken = "44a5399dcce96325fadfab908e614bf00e6fe967";

module.exports = async (method, params, cb) => {
	// Map 'del' to 'delete' for proper HTTP method
	const httpMethod = (method === 'del') ? 'delete' : method;

	let options = {
		url: params.uri,
		method: httpMethod.toUpperCase(),
		headers: {
			key: extKey,
			'Accept': 'application/json'
		},
		responseType: 'json',  // Explicitly request JSON responses
		transformResponse: [(data) => {
			// Handle JSON parsing explicitly
			if (typeof data === 'string') {
				try {
					return JSON.parse(data);
				} catch (e) {
					return data;
				}
			}
			return data;
		}]
	};

	if (!params.public){
		options.headers.access_token = accessToken;
	}

	if (params.headers) {
		for (let header in params.headers) {
			if (Object.hasOwnProperty.call(params.headers, header)) {
				options.headers[header] = params.headers[header];
			}
		}
	}

	// Handle form data
	if (params.form) {
		options.data = params.form;
		options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
	}

	// Handle JSON body
	if (params.body) {
		options.data = params.body;
	}

	// Handle query string parameters
	if (params.qs) {
		options.params = params.qs;
	}

	try {
		const response = await axios(options);
		// Don't assert on response.data - some responses (like DELETE) may have empty bodies
		return cb(null, response.data);
	} catch (error) {
		// axios throws on non-2xx responses, but integration tests expect callback with data
		if (error.response) {
			// HTTP error response (any status code outside 2xx)
			// Integration tests expect these responses to be passed through, not treated as errors
			const body = error.response.data;
			return cb(null, body);
		} else {
			// Network or other error (no response received)
			assert.ifError(error);
			return cb(error);
		}
	}
};
