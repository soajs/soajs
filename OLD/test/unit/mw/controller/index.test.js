"use strict";
var assert = require("assert");
var helper = require("../../../helper.js");

var index = helper.requireModule('./mw/controller/index.js');

const sinon = require('sinon');
var coreModules = require("soajs.core.modules");
var core = coreModules.core;

describe("Testing Controller index - returnKeyAndPermissions /key/permission/get", function () {
	
	let serviceStub1;
	let serviceStub2;
	let serviceStub3;
	
	var req = {
		soajs: {
            controller : {
                serviceParams: {
                    serviceInfo:[ '', 'key', 'permission', 'get' ],
                    parsedUrl: {
                        protocol: 'http:',
                        slashes: true,
                        auth: null,
                        host: '127.0.0.1:4000',
                        port: '4000',
                        hostname: '127.0.0.1',
                        hash: null,
                        search: '',
                        query: {},
                        pathname: '/key/permission/get',
                        path: '/key/permission/get',
                        href: 'http://127.0.0.1:4000/key/permission/get' },
                    service_nv:'key',
                    service_n:'key',
                    service_v:null
                }
            },
			tenant: {
				application: {}
			},
			uracDriver: {
				getProfile: function () {
					let output = {
						tenant: {}
					};
					return output;
				},
				getAclAllEnv: function () {
					return null;
				}
			},
			log: {
				fatal: function (msg) {
					console.log(msg);
				},
				error: function (msg) {
					console.log(msg);
				},
				debug: function (msg) {
					console.log(msg);
				}
			},
			registry: {
				services: {
					"controller": {}
				}
			},
			controllerResponse: function (resp) {
				console.log(resp);
				return resp;
			}
		},
		headers: {
			key: "123"
		},
		url: "http://127.0.0.1:4000/key/permission/get"
	};
	var res = {};
	
	afterEach(function (done) {
		if (serviceStub1) {
			serviceStub1.restore();
		}
		if (serviceStub2) {
			serviceStub2.restore();
		}
		if (serviceStub3) {
			serviceStub3.restore();
		}
		done();
	});
	
	it("fail - soajs mw is not started", function (done) {
		var functionMw = index();
		
		try {
			functionMw({}, res, null);
		} catch (error) {
			assert.deepEqual(error.toString(), 'TypeError: soajs mw is not started');
			done();
		}
	});
	
	it("fail - findExtKey error", function (done) {
		var functionMw = index();
		
		serviceStub1 = sinon.stub(core.provision, 'getEnvironmentExtKeyWithDashboardAccess').callsFake ( (tenant, cb) => {
				return cb({code: 1, message: "erreur"});
			}
		);
		
		functionMw(req, res, function (error) {
			let returnKeyAndPermissions = req.soajs.controller.gotoservice;
			
			returnKeyAndPermissions(req, res);
			
			done();
		});
	});
	
	it("fail - findKeyPermissions error", function (done) {
		var functionMw = index();
		
		serviceStub1 = sinon.stub(core.provision, 'getEnvironmentExtKeyWithDashboardAccess').callsFake ((tenant, cb) => {
				return cb(null, {});
			}
		);
		serviceStub2 = sinon.stub(core.registry, 'getAllRegistriesInfo').callsFake ((cb) => {
				return cb({code: 2, message: "erreur"});
			}
		);
		
		functionMw(req, res, function (error) {
			let returnKeyAndPermissions = req.soajs.controller.gotoservice;
			
			returnKeyAndPermissions(req, res);
			
			done();
		});
	});
	
	it("success", function (done) {
		var functionMw = index();
		
		serviceStub1 = sinon.stub(core.provision, 'getEnvironmentExtKeyWithDashboardAccess').callsFake ((tenant, cb) => {
				return cb(null, {});
			}
		);
		serviceStub2 = sinon.stub(core.registry, 'getAllRegistriesInfo').callsFake ((cb) => {
				return cb();
			}
		);
		serviceStub3 = sinon.stub(core.provision, 'getEnvironmentsFromACL').callsFake ((acl, env) => {
				return {};
			}
		);
		
		functionMw(req, res, function (error) {
			let returnKeyAndPermissions = req.soajs.controller.gotoservice;
			returnKeyAndPermissions(req, res);
			done();
		});
	});
});

describe("Testing Controller index - proxy/redirect", function () {
	
	let serviceStub1;
	let serviceStub2;
	let serviceStub3;
	
	var req = {
		soajs: {

            controller : {
                serviceParams: {
                    serviceInfo:[ '', 'proxy', 'redirect', 'test' ],
                    parsedUrl: {
                        protocol: 'http:',
                        slashes: true,
                        auth: null,
                        host: '127.0.0.1:4000',
                        port: '4000',
                        hostname: '127.0.0.1',
                        hash: null,
                        search: '?__env=ENV&proxyRoute=/test',
                        query: { __env: 'ENV', proxyRoute: '/test' },
                        pathname: '/proxy/redirect/test',
                        path: '/proxy/redirect/test?__env=ENV&proxyRoute=/test',
                        href: 'http://127.0.0.1:4000/proxy/redirect/test?__env=ENV&proxyRoute=/test' },
                    service_nv:'proxy',
                    service_n:'proxy',
                    service_v:null
                }
            },
			tenant: {
				application: {}
			},
			uracDriver: {
				getProfile: function () {
					let output = {
						tenant: {}
					};
					return output;
				},
				getAclAllEnv: function () {
					return null;
				}
			},
			log: {
				fatal: function (msg) {
					console.log(msg);
				},
				error: function (msg) {
					console.log(msg);
				},
				warn: function (msg) {
					console.log(msg);
				},
				debug: function (msg) {
					console.log(msg);
				}
			},
			registry: {
				services: {
					"controller": {},
					"test": {}
				},
				serviceConfig: {
					key: "1"
				}
			},
			controllerResponse: function (resp) {
				console.log(resp);
				return resp;
			}
		},
		headers: {
			key: "123"
		},
		url: "http://127.0.0.1:4000/proxy/redirect/test?__env=ENV&proxyRoute=/test",
		method: "PUT",
		query: {
			"lengthwillbe" : "greaterThenOne"
		},
		pipe: function (proxy) {
			return {
				pipe: function (res) {
					// chill
				}
			};
		}
	};
	
	var res = {};
	
	afterEach(function (done) {
		if (serviceStub1) {
			serviceStub1.restore();
		}
		if (serviceStub2) {
			serviceStub2.restore();
		}
		if (serviceStub3) {
			serviceStub3.restore();
		}
		
		done();
	});
	
	it("fail - Unknown service", function (done) {
		var functionMw = index();
		functionMw(req, res);
		// error sent in controllerResponse
		done();
	});
	
	it("fail - key.getinfo error", function (done) {
		var functionMw = index();
		
		serviceStub1 = sinon.stub(core.key, 'getInfo').callsFake ((key1, key2, cb) => {
				return cb({code: 1, message: "erreur"});
			}
		);
		
		functionMw(req, res, function (error) {
		});
		// error sent in controllerResponse
		
		done();
	});
	
	it("fail - getOriginalTenantRecord error", function (done) {
		var functionMw = index();
		
		serviceStub1 = sinon.stub(core.key, 'getInfo').callsFake ((key1, key2, cb) => {
				return cb(null, "key");
			}
		);
		
		serviceStub2 = sinon.stub(core.provision, 'getTenantByCode').callsFake ((code, cb) => {
				return cb({code: 1, message: "erreur"});
			}
		);
		
		functionMw(req, res, function (error) {
			let proxyRequest = req.soajs.controller.gotoservice;
			proxyRequest(req, res);
			done();
		});
	});
	
	it("fail - proxyRequest - loadByEnv on error", function (done) {
		var functionMw = index();
		
		serviceStub1 = sinon.stub(core.key, 'getInfo').callsFake ((key1, key2, cb) => {
				return cb(null, "key");
			}
		);
		serviceStub2 = sinon.stub(core.registry, 'loadByEnv').callsFake ((obj, cb) => {
				let reg = {};
				return cb({code: 2, message: "erreur"});
			}
		);
		
		serviceStub3 = sinon.stub(core.provision, 'getTenantByCode').callsFake ((code, cb) => {
				let tenant = {
					applications: [
						{
							keys: [
								{
									extKeys: [
										{
											env: "ENV",
											dashboardAccess: true,
											extKey: "ABCDEF"
										}
									]
								}
							]
						}
					]
				};
				return cb(null, tenant);
			}
		);
		
		functionMw(req, res, function (error) {
			let proxyRequest = req.soajs.controller.gotoservice;
			proxyRequest(req, res);
			done();
		});
	});
	
	it("success - proxyRequest - loadByEnv success", function (done) {
		var functionMw = index();
		
		serviceStub1 = sinon.stub(core.key, 'getInfo').callsFake ((key1, key2, cb) => {
				return cb(null, "key");
			}
		);
		serviceStub2 = sinon.stub(core.registry, 'loadByEnv').callsFake ((obj, cb) => {
				let reg = {
					protocol: "http",
					apiPrefix: "",
					domain: "127.0.0.1",
					port: 80,
					deployer:{
						type: 'manual'
					}
				};
				return cb(null, reg);
			}
		);
		serviceStub3 = sinon.stub(core.provision, 'getTenantByCode').callsFake ((code, cb) => {
				let tenant = {
					applications: [
						{
							keys: [
								{
									extKeys: [
										{
											env: "ENV",
											dashboardAccess: true,
											extKey: "ABCDEF"
										}
									]
								}
							]
						}
					]
				};
				return cb(null, tenant);
			}
		);
		
		functionMw(req, res, function (error) {
			let proxyRequest = req.soajs.controller.gotoservice;
			proxyRequest(req, res);
			done();
		});
	});
});