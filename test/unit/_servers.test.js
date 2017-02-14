"use strict";
var assert = require('assert');
var shell = require('shelljs');
var sampleData = require("soajs.mongodb.data/modules/soajs");

describe("importing sample data", function () {
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

	after(function (done) {
		setTimeout(function () {
			console.log('test data imported.');
			require("./controllerServer.unit.test.js");
			require("./core.email.test.js");
			require("./core.error.test.js");
			require("./core.key.test.js");
			require("./core.logger.test.js");
			require("./core.meta.test.js");
			require("./core.provision.test.js");
			require("./core.security.test.js");
			require("./core.validator.test.js");
			require("./lib.utils.test.js");
			require("./mw-cors.test.js");
			require("./soajs.mongo.test.js");
			require("./soajs.es.test.js");
			require("./soajs.contentbuilder.test.js");
			require("./soajs.mongoStore.test.js");
			require("./soajs.provision.test.js");
			done();
		}, 1000);
	});
});