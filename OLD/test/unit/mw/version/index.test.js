"use strict";
var assert = require("assert");
var helper = require("../../../helper.js");

var index = helper.requireModule('./mw/version/index.js');

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


describe("testing version index", function () {
	
	let serviceStub;
	let serviceStub2;
	
	afterEach(function (done) {
		if (serviceStub) {
			serviceStub.restore();
		}
		if (serviceStub2) {
			serviceStub2.restore();
		}
		done();
	});
	/*
	it("Fail test - getExternalKeyData wrong key object - 153", function (done) {
		
		serviceStub = sinon.stub(provision, 'getExternalKeyData', (extKey, keyConfig, cb) => {
				return cb({
					error : true
				});
			}
		);
		
		var functionMw = index(configuration);
		
		functionMw(req, res, function (error) {
			assert.equal(error, 153);
			done();
		});
		
	});
	
	it("Fail test - getPackageData wrong pack - 152", function (done) {
		
		serviceStub = sinon.stub(provision, 'getExternalKeyData', (extKey, keyConfig, cb) => {
				return cb(null, getExternalKeyDataKeyObj);
			}
		);
		
		serviceStub2 = sinon.stub(provision, 'getPackageData', (code, cb) => {
				return cb({
					error: true
				});
			}
		);
		
		var functionMw = index(configuration);
		
		functionMw(req, res, function (error) {
			assert.equal(error, 152);
			done();
		});
		
	});
	*/
	it("Success test", function (done) {
		
		
		serviceStub = sinon.stub(provision, 'getExternalKeyData').callsFake ((extKey, keyConfig, cb) => {
				return cb(null, getExternalKeyDataKeyObj);
			}
		);
		
		serviceStub2 = sinon.stub(provision, 'getPackageData').callsFake ((code, cb) => {
				var pack = {};
				return cb(null, pack);
			}
		);

		
		var functionMw = index(configuration);
		
		functionMw(req, res, function () {
			assert.ok(true); // mw next function is called
			done();
		});
		
	});
});


