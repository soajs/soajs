"use strict";
var assert = require('assert');

describe("starting integration tests", function () {
	it("loading tests", function (done) {
		require("./inputMask-spec.js");
		require("./service-oauth-secured.js");
		require("./service-multitenant.js");
		require("./x-service-acl.js");
		require("./x-service-acl2.js");
		require("./servers.daemon.cron.js");
		require("./servers.daemon.js");
		require("./controller.js");
		require("./controller-proxy.js");
		require("./maintenance-operations.test.js");
		done();
	});
});