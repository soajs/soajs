"use strict";
var assert = require("assert");
var helper = require("../../../helper.js");

var mockedDataStandards = require('./../../mocked-data/standards');
var objectWithAclData = mockedDataStandards.objectWithAclData;

var coreModules = require("soajs.core.modules");
var provision = coreModules.provision;
var core = coreModules.core;
var registry = coreModules.core.registry;
const sinon = require('sinon');

var oldValueSet = process.env.SOAJS_ENV;
process.env.SOAJS_ENV = "dashboard";
var utils = helper.requireModule('./mw/mt/utils.js');
process.env.SOAJS_ENV = oldValueSet;

describe("testing utils dashboard", function () {
	
	let provisionStub;
	
	afterEach(function (done) {
		if (provisionStub) {
			provisionStub.restore();
		}
		done();
	});
	
	it("test uracCheck - getEnvRegistry - same env", function (done) {
		
		provisionStub = sinon.stub(provision, 'getTenantData').callsFake ((code, cb) => {
				return cb(null, {});
			}
		);
		
		var obj = {
			req : {
				oauth : {
					bearerToken : {
						clientId : 222,
						env : "dashboard"
					}
				},
				soajs : {
					log : {
						error : function(input){
							// console.error(input);
						},
						debug: function(input){
							// console.error(input);
						}
					},
					tenant : {
						id : 123,
						key : "123"
					}
				}
			},
			keyObj : {
				config : {}
			}
		};
		utils.uracCheck(obj, function (error, output) {
			assert.ok(output);
			done();
		});
	});
	
});