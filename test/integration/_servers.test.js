"use strict";
var assert = require('assert');

describe("starting integration tests", function () {
	it("loading tests", function (done) {
		require("./inputMask-spec.js");
		require("./service-oauth-secured.js");
		require("./service-multitenant.js");
		require("./servers.daemon.cron.js");
		require("./servers.daemon.js");
		require("./maintenance-operations.test.js");
		done();
	});
});