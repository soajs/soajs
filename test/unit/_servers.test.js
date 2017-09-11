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
			//require("./controllerServer.unit.test.js");
			require("./mw-cors.test.js");
			require("./mw-urac.test.js");
			require("./mw-imfv.test.js");
			
			require("./mw/mt/utils-dev.test.js");
			require("./mw/mt/utils-dashboard.test.js");
			require("./mw/mt/index.test.js");
			
			require("./mw/enhancer/index.test.js");
			
			require("./mw/favicon/index.test.js");
			
			require("./mw/inputmask/index.test.js");
			require("./mw/inputmask/inputmask.test.js");
			
			require("./mw/controller/index.test.js");
			
			require("./mw/response/index.test");
			require("./mw/response/response.test");
			
			require("./mw/service/index.test.js");
			
			// require("./mw/awarenessEnv/custom.test"); //
			
			// require("./mw/awareness/index.test.js"); //
			
			require("./classes/MultiTenantSession.test");
			
			// require("./servers/controller.test"); //
			require("./servers/daemon.test");
			
			require("./utilities/utils.test");
			
			done();
		}, 1000);
	});
});