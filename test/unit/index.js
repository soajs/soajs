"use strict";
/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */

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

		require("./utilities/utils.js");
		require("./utilities/header.js");
		require("./utilities/logger.js");
		require("./utilities/request.js");

		require("./classes/http.js");
		require("./classes/MultiTenantSession.js");

		require("./mw/inputmask/index.js");
		require("./mw/inputmask/inputmask.js");
		require("./mw/inputmask/redos-fix.js");
		require("./mw/inputmask/prototype-pollution-fix.js");
		require("./mw/response/index.js");
		require("./mw/service/index.js");
		require("./mw/service/urac.js");
		require("./mw/soajs/index.js");

		require("./index-error-handlers.js");

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