"use strict";
var assert = require("assert");
var helper = require("../../../helper.js");

var index = helper.requireModule('./mw/mt/index.js');

var coreModules = require("soajs.core.modules");
var provision = coreModules.provision;
var utils = helper.requireModule("./mw/mt/utils");
const sinon = require('sinon');
var mockedDataRequest = require('./../../mocked-data/request');
var mockedDataStandards = require('./../../mocked-data/standards');

// mocked data
var req = mockedDataRequest.request1;
var res = {};
var configuration = mockedDataStandards.configuration;
var getExternalKeyDataKeyObj = mockedDataStandards.getExternalKeyDataKeyObj;
var getTenantOauthObj = mockedDataStandards.getTenantOauthObj;
var utilsData = {
	req: {
		soajs: {
			controller: {
				serviceParams: {
					name: "data"
				}
			},
			tenant: {
				roaming: {}
			}
		}
	}
};

describe("testing Multitenant index", function () {
	
	let serviceStub;
    let serviceStub3;
	let serviceStubUtils1;
	let serviceStubUtils2;
	let serviceStubUtils3;
	let serviceStubUtils4;
	let serviceStubUtils5;
	let serviceStubUtils6;
	let serviceStubUtils7;
	
	afterEach(function (done) {
		if (serviceStub3) {
            serviceStub3.restore();
		}
		if (serviceStubUtils1) {
			serviceStubUtils1.restore();
		}
		if (serviceStubUtils2) {
			serviceStubUtils2.restore();
		}
		if (serviceStubUtils3) {
			serviceStubUtils3.restore();
		}
		if (serviceStubUtils4) {
			serviceStubUtils4.restore();
		}
		if (serviceStubUtils5) {
			serviceStubUtils5.restore();
		}
		if (serviceStubUtils6) {
			serviceStubUtils6.restore();
		}
		if (serviceStubUtils7) {
			serviceStubUtils7.restore();
		}
		done();
	});

	it("Fail test - getExternalKeyData wrong key object - 153", function (done) {
		
		var functionMw = index(configuration);
		
		functionMw(req, res, function (error) {
			assert.equal(error, 153);
			done();
		});
		
	});
	
	it("Fail test - getPackageData wrong pack - 152", function (done) {


        req.soajs.controller.serviceParams.keyObj = getExternalKeyDataKeyObj;

        serviceStub3 = sinon.stub(provision, 'getTenantOauth').callsFake ((id, cb) => {
                return cb(null, getTenantOauthObj);
            }
        );

		
		var functionMw = index(configuration);
		
		functionMw(req, res, function (error) {
			assert.equal(error, 152);
			done();
		});
		
	});

	it("Success test", function (done) {

        req.soajs.controller.serviceParams.packObj = {};

        serviceStub3 = sinon.stub(provision, 'getTenantOauth').callsFake ((id, cb) => {
                return cb(null, getTenantOauthObj);
            }
        );

		// utils stubs
		serviceStubUtils1 = sinon.stub(utils, 'securityGeoCheck').callsFake ((obj, cb) => {
				return cb(null, utilsData);
			}
		);
		serviceStubUtils2 = sinon.stub(utils, 'securityDeviceCheck').callsFake ((code, cb) => {
				return cb(null, utilsData);
			}
		);
		serviceStubUtils3 = sinon.stub(utils, 'oauthCheck').callsFake ((code, cb) => {
				return cb(null, utilsData);
			}
		);
		serviceStubUtils4 = sinon.stub(utils, 'uracCheck').callsFake ((code, cb) => {
				return cb(null, utilsData);
			}
		);
		serviceStubUtils5 = sinon.stub(utils, 'serviceCheck').callsFake ((code, cb) => {
				return cb(null, utilsData);
			}
		);
		serviceStubUtils6 = sinon.stub(utils, 'apiCheck').callsFake ((code, cb) => {
				return cb(null, utilsData);
			}
		);
		serviceStubUtils7 = sinon.stub(utils, 'aclCheck').callsFake ((code, cb) => {
				return cb(null, utilsData);
			}
		);
		
		var functionMw = index(configuration);
		
		functionMw(req, res, function () {
			assert.ok(true); // mw next function is called
			done();
		});
		
	});
});


