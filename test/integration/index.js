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
	
	before((done) => {
		let rootPath = process.cwd();
		imported.runPath(rootPath + "/test/data/soajs_profile.js", rootPath + "/test/data/integration/", true, null, (err, msg) => {
			if (err) {
				console.log(err);
			}
			if (msg) {
				console.log(msg);
			}
			done();
		});
	});
	
	it("loading tests", (done) => {
		require ("./inputmask/index.js");
		require ("./vanilla/index.js");
		done();
	});
	
	it("loading use cases", (done) => {
		done();
	});
});