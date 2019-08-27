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
	
	it('running unit tests', function (done) {
		setTimeout(function () {
			console.log('test data imported.');
			
			require("./mw-cors.test.js");
			require("./mw-urac.test.js");
			require("./mw-imfv.test.js");
			
			require("./mw/mt/utils-dev.test.js");
			require("./mw/mt/utils-dashboard.test.js");
			require("./mw/mt/index.test.js");
            require("./mw/mt/lib.js");

            require("./mw/oauth/index.test.js");

			require("./mw/enhancer/index.test.js");
			
			require("./mw/favicon/index.test.js");
			
			require("./mw/inputmask/index.test.js");
			require("./mw/inputmask/inputmask.test.js");
			
			require("./mw/controller/index.test.js");
			
			require("./mw/response/index.test");
			require("./mw/response/response.test");
			
			require("./mw/service/index.test.js");
			require("./mw/traffic/index.test.js");

            require("./mw/version/index.test.js");

			require("./classes/MultiTenantSession.test");
			require("./utilities/utils.test");
			
			require("./mw/awarenessEnv/custom.test.js");
			require("./mw/awarenessEnv/ha.test.js");
			
			require("./servers/controller.test.js");
			require("./servers/daemon.test.js");
			
			done();
		}, 1000);
	});
});