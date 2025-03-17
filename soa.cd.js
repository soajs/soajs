"use strict";

const SOAJS_URL = process.env.SOAJS_URL;
const SOAJS_key = process.env.SOAJS_key;
const SOAJS_cd_auth = process.env.SOAJS_cd_auth;
const SOAJS_repo_auth = process.env.SOAJS_repo_auth;
const SOAJS_repo_tag = process.env.SOAJS_repo_tag;
const SOAJS_repo_commit = process.env.SOAJS_repo_commit;
const SOAJS_repo_branch = process.env.SOAJS_repo_branch;
const SOAJS_img_name = process.env.SOAJS_img_name;
const SOAJS_img_prefix = process.env.SOAJS_img_prefix;
const SOAJS_img_tag = process.env.SOAJS_img_tag;

let SOAJS_env_list;

const https = require("https");
const http = require("http");

function httpRequest({ uri, data = null, body = null, qs = null, method = "GET", headers = null, json = true }) {
	return new Promise((resolve, reject) => {
		data = data || body; // to be compatible with request package

		let onResponse = false;
		let options = {};
		let urlObj = {};

		const requestDataString = data ? (json ? JSON.stringify(data) : data.toString()) : "";
		try {
			urlObj = new URL(uri);

			if (qs) {
				// Merge query parameters into the path
				const existingParams = new URLSearchParams(urlObj.search);
				const mergedParams = new URLSearchParams();

				// Add existing params
				existingParams.forEach((value, key) => {
					mergedParams.append(key, value);
				});
				// Add/override queryParams
				for (const key in qs) {
					if (qs.hasOwnProperty(key)) {
						mergedParams.set(key, qs[key]);
					}
				}
				urlObj.search = mergedParams.toString();
			}

			options = {
				"hostname": urlObj.hostname,
				"port": urlObj.port || 443,
				"path": urlObj.pathname + urlObj.search,
				"method": method.toUpperCase(),
				"headers": {
					"Content-Type": json ? "application/json" : "application/x-www-form-urlencoded",
					"Content-Length": data ? Buffer.byteLength(requestDataString) : 0,
				},
			};

			if (headers) {
				for (const key in headers) {
					if (headers.hasOwnProperty(key)) {
						options.headers[key] = headers[key];
					}
				}
			}
		} catch (error) {
			if (!onResponse) {
				onResponse = true;
				return reject({ error: error, body: null }); // Reject with error and null data for request errors
			}
		}
		let req = null;
		if (urlObj.protocol === "https:") {
			req = https.request(options);
		} else {
			req = http.request(options);
		}

		req.on("response", (res) => { // Listen for the "response" event
			let responseData = "";

			res.on("data", (chunk) => {
				responseData += chunk;
			});

			res.on("end", () => {
				if (!onResponse) {
					onResponse = true;
					if (res.statusCode < 200 || res.statusCode >= 300) {
						const error = new Error(`Status Code: ${res.statusCode}`);
						try {
							const parsedData = json ? JSON.parse(responseData) : responseData;
							return reject({ error: error, body: parsedData }); // Reject with error and data
						} catch (parseError) {
							return reject({ error: error, body: responseData }); // Reject with error and raw data if parse fails
						}
					}

					try {
						const parsedData = json ? JSON.parse(responseData) : responseData;
						return resolve(parsedData);
					} catch (parseError) {
						return resolve(responseData);
					}
				}
			});

			res.on("close", () => {
				if (!onResponse) {
					onResponse = true;
					return reject({ error: new Error("Closed"), body: null }); // Reject with error and null data for request errors
				}
			});
			res.on("error", (error) => {
				if (!onResponse) {
					onResponse = true;
					return reject({ error: error, body: null }); // Reject with error and null data for request errors
				}
			});
		});

		req.on("close", () => {
			if (!onResponse) {
				onResponse = true;
				return reject({ error: new Error("Closed"), body: null }); // Reject with error and null data for request errors
			}
		});
		req.on("error", (error) => {
			if (!onResponse) {
				onResponse = true;
				return reject({ error: error, body: null }); // Reject with error and null data for request errors
			}
		});

		if (data) {
			req.write(requestDataString);
		}
		req.end();
	});
}

let utils = {
	"init": function (cb) {
		console.log("Initializing CD script");

		if (!SOAJS_URL) {
			console.log("SOAJS_URL environment variable not found");
			process.exit(-1);
		}

		if (!SOAJS_key) {
			console.log("SOAJS_key environment variable not found");
			process.exit(-1);
		}

		if (!SOAJS_cd_auth) {
			console.log("SOAJS_cd_auth environment variable not found");
			process.exit(-1);
		}

		if (!SOAJS_repo_tag &&
			!(SOAJS_repo_commit && SOAJS_repo_branch) &&
			!(SOAJS_img_name && SOAJS_img_prefix && SOAJS_img_tag) &&
			!SOAJS_img_tag) {
			console.log("Missing CD Environment variable not found");
			process.exit(-1);
		}
		if (SOAJS_img_prefix && SOAJS_img_name) {
			if (!(SOAJS_img_prefix && SOAJS_img_name && SOAJS_img_tag)) {
				console.log("You can either set [SOAJS_img_tag] or [SOAJS_img_tag && SOAJS_img_prefix && SOAJS_img_name]");
				process.exit(-1);
			}
		}

		//example export SOAJS_env_list=dashboard,dev
		if (process.env.SOAJS_env_list) {
			try {
				SOAJS_env_list = process.env.SOAJS_env_list.split(",");
			} catch (e) {
				console.log("Malformed SOAJS_env_list environment variable!");
				process.exit(-1);
			}
		}
		console.log("Launching CD call...");
		utils.createRequest(function (params) {
			params.method = "PUT";
			httpRequest(params)
				.then((body) => {
					cb(null, body);
				})
				.catch(({ error, body }) => {
					cb(body || error, null);
				});
			// request.put(params, cb);
		});
	},

	"createRequest": function (cb) {
		let params = {};

		params.uri = SOAJS_URL;

		let soa;
		try {
			soa = require("./config.js");
		} catch (e) {
			try {
				soa = require("./soa.json");
			} catch (e) {
				console.log("soa.json file not found, make sure the CD script is on the same path as soa.json");
				process.exit(-1);
			}
		}

		if (soa.type === "multi") {
			console.log("Service of type multi is not supported!");
			process.exit(-1);
		}
		params.qs = {
			token: SOAJS_cd_auth,
			repo_token: SOAJS_repo_auth,
			name: soa.serviceName || soa.name,
			type: soa.type || soa.type,
			version: soa.serviceVersion || soa.version,
		};
		params.body = {
			config: {
				from: {}
			}
		};

		if (SOAJS_repo_tag) {
			params.body.config.from.tag = SOAJS_repo_tag;
		} else if (SOAJS_repo_branch && SOAJS_repo_commit) {
			params.body.config.from.branch = SOAJS_repo_branch;
			params.body.config.from.commit = SOAJS_repo_commit;
		}

		if (SOAJS_img_tag) {
			params.body.config.from.image_tag = SOAJS_img_tag;
		}
		if (SOAJS_img_prefix) {
			params.body.config.from.image_prefix = SOAJS_img_prefix;
		}
		if (SOAJS_img_name) {
			params.body.config.from.image_name = SOAJS_img_name;
		}
		if (SOAJS_env_list) {
			params.body.config.from.env = SOAJS_env_list;
		}

		params.headers = {
			"key": SOAJS_key,
			"Content-Type": "application/json"
		};

		params.json = true;

		return cb(params);
	}
};


// utils.init((err, response, body) => {
utils.init((err, body) => {
	if (err) {
		console.log(JSON.stringify(err, null, 2));
		process.exit(-1);
	} else {
		console.log(JSON.stringify(body, null, 2));
		if (!body || !body.result) {
			console.log("CD failed! for more information, check out notification under soajs console ...");
			process.exit(-1);
		}
	}
});
