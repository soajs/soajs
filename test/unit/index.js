/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */

"use strict";
const imported = require("../data/import.js");

describe("Starting Unit test", () => {
	
	before((done) => {
		let rootPath = process.cwd();
		imported.runPath(rootPath + "/test/data/soajs_profile.js", rootPath + "/test/data/unit/", true, null, (err, msg) => {
			if (err) {
				console.log(err);
			}
			if (msg) {
				console.log(msg);
			}
			done();
		});
	});
	
	it("Unit test for BL", (done) => {
		require("./classes/http.js");
		require("./classes/MultiTenantSession.js");
		require("./mw/service/index.js");
		done();
	});
	
	it("Unit test for Model", (done) => {
		//require("./model/mongo/marketplace.js");
		done();
	});
	
	after((done) => {
		done();
	});
	
});