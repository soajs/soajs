"use strict";
var assert = require('assert');
var shell = require('shelljs');
var sampleData = require("soajs.mongodb.data/modules/soajs");

describe("starting integration tests", function () {
	
	it("do import", function (done) {
		shell.pushd(sampleData.dir);
		shell.exec("chmod +x " + sampleData.shell, function (code) {
			assert.equal(code, 0);
			shell.exec(sampleData.shell, function (code) {
				assert.equal(code, 0);
				shell.popd();
				done();
			});
		});
	});
	
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