"use strict";

/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */

const imported = require("../data/import.js");


describe("starting integration tests", () => {
	
	let controller;
	
	before((done) => {
		let rootPath = process.cwd();
		imported.runPath(rootPath + "/test/data/soajs_profile.js", rootPath + "/test/data/integration/", true, null, (err, msg) => {
			if (err) {
				console.log(err);
			}
			if (msg) {
				console.log(msg);
			}
			console.log("Starting Controller ...");
			controller = require("soajs.controller/_index.js");
			controller.runService(() => {
				setTimeout(function () {
					done();
				}, 5000);
			});
		});
	});
	
	it("loading tests", (done) => {
		require("./daemon/index.js");
		require("./inputmask/index.js");
		require("./vanilla/index.js");
		done();
	});
	
	it("loading use cases", (done) => {
		done();
	});
});