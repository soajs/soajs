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
process.env.SOAJS_ENV = "dev";
var utils = helper.requireModule('./mw/mt/utils.js');
process.env.SOAJS_ENV = oldValueSet;

describe("testing utils", function () {
	
	let provisionStub;
	let provisionStub2;
	
	afterEach(function (done) {
		if (provisionStub) {
			provisionStub.restore();
		}
		if (provisionStub2) {
			provisionStub2.restore();
		}
		done();
	});
	
	it("test serviceCheck - no api no apisRegExp", function (done) {
		var obj = {
			req: {
				soajs: {
					controller: {
						serviceParams: {
							name: "test"
						}
					}
				},
				method: "test"
			},
			keyObj: {
				application: {
					acl: {
						test: {
							access: true,
							apis: false,
							apisRegExp: false,
							apisPermission: true,
							test: {
								data: "data"
							}
						},
						access: false
					}
				}
			},
			packObj: {}
		};
		utils.serviceCheck(obj, function (body) {
			assert.ok(true);
			done();
		});
	});
	
	it("test serviceCheck - with an attribute route", function (done) {
		var obj = {
			req: {
				soajs: {
					controller: {
						serviceParams: {
							name: "test"
						}
					}
				},
				method: "test"
			},
			keyObj: {
				application: {
					acl: {
						test: {
							"apis": {
								"/categories": {},
								"/products": {},
								"/product/:serial": {},
								"/featuredProducts": {},
								"/merchants": {}
							},
							apisRegExp: false,
							apisPermission: true,
							test: {
								data: "data"
							}
						},
						access: false
					}
				}
			},
			packObj: {}
		};
		utils.serviceCheck(obj, function (body) {
			assert.ok(true);
			done();
		});
	});
	
	it("test apiCheck - api reg exp", function (done) {
		var obj = {
			req: {
				soajs: {
					controller: {
						serviceParams: {
							name: "test",
							path: "lolaa"
						}
					}
				},
				method: "test"
			},
			keyObj: {
				application: {
					acl: {
						test: {
							apisRegExp: [
								{
									"regExp": /^\/admin\/.+$/,
									"access": ["gold"]
								},
								{
									'regExp': /^\/account\/.+$/,
									'access': true
								}
							],
							apis: {
								"/categories": {},
								"/products": {},
								"/product/:serial": {},
								"/featuredProducts": {},
								"/merchants": {}
							},
						},
						access: false
					}
				}
			}
		};
		utils.apiCheck(obj, function (body) {
			assert.ok(true);
			done();
		});
	});
	
	it("test securityDeviceCheck", function (done) {
		var obj = {
			req: {
				getClientUserAgent: function () {
					return "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36";
				},
				soajs: {
					controller: {
						serviceParams: {
							name: "test",
							path: "lolaa"
						}
					}
				},
				method: "test"
			},
			keyObj: {
				device: {
					"allow": [{"family": "chrome"}], "deny": [
						{
							family: '*',
							os: {
								family: 'major'
							}
						}
					]
				}
			}
		};
		utils.securityDeviceCheck(obj, function (body) {
			assert.ok(true);
			done();
		});
	});
	
	it("test aclCheck", function (done) {
		
		var obj = {
			req: {
				getClientUserAgent: function () {
					return "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36";
				},
				soajs: {
					controller: {
						serviceParams: {
							name: "test",
							path: "lol"
						}
					},
					log: {
						debug: function (input) {
							console.log(input);
						}
					}
				},
				method: "test"
			},
			keyObj: objectWithAclData.keyObj,
			packObj: objectWithAclData.packObj
		};
		utils.aclCheck(obj, function (body) {
			assert.ok(true);
			done();
		});
	});
	
	it("test2 aclCheck", function (done) {
		
		var obj = {
			req: {
				getClientUserAgent: function () {
					return "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36";
				},
				soajs: {
					controller: {
						serviceParams: {
							name: "test2",
							path: "lolaa"
						}
					},
					log: {
						debug: function (input) {
							console.log(input);
						}
					}
				},
				method: "test2"
			},
			keyObj: objectWithAclData.keyObj,
			packObj: objectWithAclData.packObj
		};
		utils.aclCheck(obj, function (body) {
			assert.ok(true);
			done();
		});
	});
	
	it("test securityGeoCheck - fail on deny : Geographic security configuration failed", function (done) {
		var obj = {
			req: {
				soajs: {
					log: {
						error: function (input) {
							// console.error(input);
						}
					}
				},
				getClientIP: function () {
					return 2;
				}
			},
			keyObj: {
				geo: {
					deny: ["wrongdata"]
				}
			}
		};
		utils.securityGeoCheck(obj, function (error, output) {
			done();
		});
	});
	
	it("test securityGeoCheck - 155 on deny", function (done) {
		var obj = {
			req: {
				soajs: {
					log: {
						error: function (input) {
							// console.error(input);
						}
					}
				},
				getClientIP: function () {
					return "192.168.2.3";
				}
			},
			keyObj: {
				geo: {
					deny: ["192.168.2.3"]
				}
			}
		};
		utils.securityGeoCheck(obj, function (error, output) {
			assert.equal(error, 155);
			done();
		});
	});
	
	it("test securityGeoCheck - fail on allow : Geographic security configuration failed", function (done) {
		
		var obj = {
			req: {
				soajs: {
					log: {
						error: function (input) {
							// console.error(input);
						}
					}
				},
				getClientIP: function () {
					return 2;
				}
			},
			keyObj: {
				geo: {
					allow: ["wrongdata"]
				}
			}
		};
		utils.securityGeoCheck(obj, function (error, output) {
			done();
		});
	});
	
	it("test securityDeviceCheck - major as string", function (done) {
		
		var obj = {
			req: {
				soajs: {
					log: {
						error: function (input) {
							// console.error(input);
						}
					}
				},
				getClientUserAgent: function () {
					return "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2227.1 Safari/537.36";
				}
			},
			keyObj: {
				device: {
					"allow": [
						{
							"family": "chrome",
							"major": "test",
							"minor": "23",
							"patch": {
								"min": "2222",
								"max": "2229"
							}
						}
					],
					"deny": [
						{
							"major": "xxx",
							"family": "IE"
						},
						null,
						{
							min: "zzz",
							major: "trolloolllooloo"
						}
					]
				}
			}
		};
		utils.securityDeviceCheck(obj, function (error, output) {
			done();
		});
	});
	
	it("test securityDeviceCheck - major as object min > chrome version", function (done) {
		
		var obj = {
			req: {
				soajs: {
					log: {
						error: function (input) {
							// console.error(input);
						}
					}
				},
				getClientUserAgent: function () {
					return "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2227.1 Safari/537.36";
				}
			},
			keyObj: {
				device: {
					"allow": [
						{
							"family": "chrome",
							"major": {
								min: "42"
							},
							"minor": "23",
							"patch": {
								"min": "2222",
								"max": "2229"
							}
						}
					],
					"deny": [
						{
							"major": "xxx",
							"family": "IE"
						},
						null,
						{
							min: "12",
							major: "trolloolllooloo"
						}
					]
				}
			}
		};
		utils.securityDeviceCheck(obj, function (error, output) {
			done();
		});
	});
	
	it("test securityDeviceCheck - major as object max > chrome version", function (done) {
		
		var obj = {
			req: {
				soajs: {
					log: {
						error: function (input) {
							// console.error(input);
						}
					}
				},
				getClientUserAgent: function () {
					return "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2227.1 Safari/537.36";
				}
			},
			keyObj: {
				device: {
					"allow": [
						{
							"family": "chrome",
							"major": {
								max: "40"
							},
							"minor": "23",
							"patch": {
								"min": "2222",
								"max": "2229"
							}
						}
					],
					"deny": [
						{
							"major": "xxx",
							"family": "IE"
						},
						null,
						{
							min: "12",
							major: "trolloolllooloo"
						}
					]
				}
			}
		};
		utils.securityDeviceCheck(obj, function (error, output) {
			done();
		});
	});
	
	it("test securityDeviceCheck - with different os", function (done) {
		
		var obj = {
			req: {
				soajs: {
					log: {
						error: function (input) {
							// console.error(input);
						}
					}
				},
				getClientUserAgent: function () {
					return "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2227.1 Safari/537.36";
				}
			},
			keyObj: {
				device: {
					"allow": [
						{
							"family": "chrome",
							"os": {
								family: "Mac OS Xx"
							},
							"major": {
								max: "40"
							},
							"minor": "23",
							"patch": {
								"min": "2222",
								"max": "2229"
							}
						}
					],
					"deny": []
				}
			}
		};
		utils.securityDeviceCheck(obj, function (error, output) {
			done();
		});
	});
	
	it("test securityDeviceCheck - with identical os different major minor & patch", function (done) {
		
		var obj = {
			req: {
				soajs: {
					log: {
						error: function (input) {
							// console.error(input);
						}
					}
				},
				getClientUserAgent: function () {
					return "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2227.1 Safari/537.36";
				}
			},
			keyObj: {
				device: {
					"allow": [
						{
							"family": "chrome",
							"os": {
								family: "Mac OS X"
							},
							"major": {
								max: "40"
							},
							"minor": "23",
							"patch": {
								"min": "2222",
								"max": "2229"
							}
						}
					],
					"deny": []
				}
			}
		};
		utils.securityDeviceCheck(obj, function (error, output) {
			done();
		});
	});
	
	it("test securityDeviceCheck - with identical os different and major", function (done) {
		
		var obj = {
			req: {
				soajs: {
					log: {
						error: function (input) {
							// console.error(input);
						}
					}
				},
				getClientUserAgent: function () {
					return "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2227.1 Safari/537.36";
				}
			},
			keyObj: {
				device: {
					"allow": [
						{
							"family": "chrome",
							"os": {
								family: "Mac OS X"
							},
							"major": "41",
							"minor": "23",
							"patch": {
								"min": "2222",
								"max": "2229"
							}
						}
					],
					"deny": []
				}
			}
		};
		utils.securityDeviceCheck(obj, function (error, output) {
			done();
		});
	});
	
	it("test uracCheck - with error", function (done) {
		provisionStub = sinon.stub(provision, 'getTenantData').callsFake ((code, cb) => {
				return cb(null, null);
			}
		);
		
		var obj = {
			req: {
				oauth: {
					bearerToken: {
						clientId: 222,
						env: "dashboard"
					}
				},
				soajs: {
					log: {
						error: function (input) {
							// console.error(input);
						},
						debug: function (input) {
							// console.error(input);
						}
					},
					tenant: {
						id: 123,
						key: "123"
					}
				}
			},
			keyObj: {
				config: {}
			}
		};
		utils.uracCheck(obj, function (error, output) {
			assert.equal(error, 170);
			done();
		});
	});
	
	it("test uracCheck - no error", function (done) {
		provisionStub = sinon.stub(provision, 'getTenantData').callsFake ((code, cb) => {
				return cb(null, {});
			}
		);
		
		var obj = {
			req: {
				oauth: {
					bearerToken: {
						clientId: 222,
						env: "dashboard"
					}
				},
				soajs: {
					log: {
						error: function (input) {
							// console.error(input);
						},
						debug: function (input) {
							// console.error(input);
						}
					},
					tenant: {
						id: 123,
						key: "123"
					}
				}
			},
			keyObj: {
				config: {}
			}
		};
		utils.uracCheck(obj, function (error, output) {
			assert.ok(output);
			done();
		});
	});
	
	it("test uracCheck - getEnvRegistry - same env", function (done) {
		
		provisionStub = sinon.stub(provision, 'getTenantData').callsFake ((code, cb) => {
				return cb(null, {});
			}
		);
		
		var obj = {
			req: {
				oauth: {
					bearerToken: {
						clientId: 222,
						env: "dev"
					}
				},
				soajs: {
					log: {
						error: function (input) {
							// console.error(input);
						},
						debug: function (input) {
							// console.error(input);
						}
					},
					tenant: {
						id: 123,
						key: "123"
					}
				}
			},
			keyObj: {
				config: {}
			}
		};
		utils.uracCheck(obj, function (error, output) {
			assert.ok(output);
			done();
		});
	});
	
	it("test uracCheck - getEnvRegistry - different env", function (done) {
		
		provisionStub = sinon.stub(provision, 'getTenantData').callsFake ((code, cb) => {
				return cb(null, {});
			}
		);
		
		provisionStub2 = sinon.stub(registry, 'loadByEnv').callsFake ((code, cb) => {
				return cb(null, null);
			}
		);
		
		
		var obj = {
			req: {
				oauth: {
					bearerToken: {
						clientId: 222,
						env: "dashboard"
					}
				},
				soajs: {
					log: {
						error: function (input) {
							// console.error(input);
						},
						debug: function (input) {
							// console.error(input);
						}
					},
					tenant: {
						id: 123,
						key: "123"
					}
				}
			},
			keyObj: {
				config: {}
			}
		};
		utils.uracCheck(obj, function (error, output) {
			assert.equal(error, 170);
			done();
		});
	});
	
	it("test apiCheck - xxx", function (done) {
		var obj = {
			req: {
				soajs: {
					controller: {
						serviceParams: {
							name: "test"
						}
					},
					uracDriver: {
						getProfile: function () {
							return {};
						},
						getGroups: function () {
							return {};
						}
					}
				}
			},
			finalAcl: {
				"apisPermission": "restricted"
			}
		};
		utils.apiCheck(obj, function (error, output) {
			assert.equal(error, 159);
			done();
		});
	});
	
	it("test apiCheck - error 157", function (done) {
		var obj = {
			req: {
				soajs: {
					uracDriver: {
						getProfile: function () {
							return {};
						},
						getGroups: function () {
							return {};
						}
					}
				}
			},
			finalAcl: {
				"apisPermission": "restricted",
				"access": []
			}
		};
		utils.apiCheck(obj, function (error, output) {
			assert.equal(error, 157);
			done();
		});
	});
	
	it("test apiCheck - error 158", function (done) {
		var obj = {
			req: {
				soajs: {}
			},
			finalAcl: {
				"apisPermission": "restricted",
				"access": true
			}
		};
		utils.apiCheck(obj, function (error, output) {
			assert.equal(error, 158);
			done();
		});
	});
	
	it("test apiCheck - fetching apis", function (done) {
		
		var obj = {
			req: {
				soajs: {
					controller: {
						serviceParams: {
							path: "test"
						}
					}
				}
			},
			finalAcl: {
				apis: {
					test: false
				},
				"apisPermission": "restricted",
				"apisRegExp": [
					{
						"access": false,
						"regExp": {}
					}
				],
				"access": true
			}
		};
		utils.apiCheck(obj, function (error, output) {
			done();
		});
	});
	
});