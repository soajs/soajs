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
			require("./mw-cors.test.js");
			require("./mw-urac.test.js");
			require("./mw-imfv.test.js");
			done();
		}, 1000);
	});
});