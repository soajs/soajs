"use strict";
var assert = require("assert");
var helper = require("../../../helper.js");

const sinon = require('sinon');

describe("Testing awarenessEnv HA", function () {
	
	let provisionStub;
	
	let ha;
	let coreModules;
	let core;
	
	before(function (done) {
		ha = helper.requireModule('./mw/awarenessEnv/ha.js');
		coreModules = require("soajs.core.modules");
		core = coreModules.core;
		
		provisionStub = sinon.stub(core.registry, 'get').callsFake (() => {
				return {
					deployer: {
						selected: "test0.test1.test2",
						container: {
							test1: {
								test2: {
									namespace: {
										default: 'test'
									}
								}
							}
						}
					}
				};
			}
		);
		
		done();
	});
	
	after(function (done) {
		if (provisionStub) {
			provisionStub.restore();
		}
		done();
	});
	
	it("test getControllerEnvHost args case 2 ", function (done) {
		let serviceName = 'test';
		
		ha.getControllerEnvHost(serviceName, function (host) {
			done();
		});
	});
	
	it("test getControllerEnvHost args case 3 ", function (done) {
		let serviceName = 'test';
		let version = 1;
		
		ha.getControllerEnvHost(serviceName, version, function (host) {
			done();
		});
	});
	
	it("test getControllerEnvHost args case 4", function (done) {
		let serviceName = 'test';
		let version = 1;
		let env = 'dashboard';
		
		ha.getControllerEnvHost(serviceName, version, env, function (host) {
			done();
		});
	});
});