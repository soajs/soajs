"use strict";
/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */

const assert = require('assert');
const express = require('express');
const axios = require('axios');

const helper = require("../../helper.js");
helper.requireModule('./classes/http');

describe("Unit test for: classes - http", function () {
	let server = null;
	let port = 6000;
	it("Create http server", function (done) {
		server = express();
		server.use((req, res) => {
			let ip = req.getClientIP();
			let uAgent = req.getClientUserAgent();
			assert.ok(ip);
			assert.ok(uAgent);
			res.writeHead(200, {'Content-Type': 'image/x-icon'});
			return res.end();
		});
		server.listen(port, function () {

		});
		done();
	});
	it("Vanilla test", async function () {
		let requestOptions = {
			method: "get",
			url: "http://127.0.0.1:" + port,
			timeout: 1000 * 3600,
			headers: {"user-agent": "tony"}
		};
		await axios(requestOptions);
	});
});