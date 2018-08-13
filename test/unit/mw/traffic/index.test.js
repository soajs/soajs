/*
 *  **********************************************************************************
 *   (C) Copyright Herrontech (www.herrontech.com)
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   Contributors:
 *   - mikehajj
 *  **********************************************************************************
 */

"use strict";
var assert = require("assert");
var helper = require("../../../helper.js");
var trafficIndex = helper.requireModule('./mw/traffic/index.js');

describe("Testing Traffic index", function () {
	
	it("success - default from environment", function (done) {
		let res = {};
		let req = {
			soajs: {
				registry: {
					serviceConfig:{
						throttling: {
							"publicAPIStrategy" : "default", // can be null means throttling is off
						    "privateAPIStrategy": "heavy", // can be null means throttling is off
						    "default": {
						        'status': 1, // 0=Off, 1=On
						        'type': 1, // 0= tenant, 1= tenant -> ip
						        'window': 60000,
						        'limit': 50,
						        'retries': 2,
						        'delay': 1000
						    }
						}
					}
				},
				controller: {
					serviceParams: {
						name: "test_service"
					}
				},
				servicesConfig: {
				
				},
				tenant: {
					id: "123456",
					name: "TEST"
				},
				controllerResponse: function(){
				
				}
			}
		};
		var functionMw = trafficIndex({});
		functionMw(req, res, function (error) {
			assert.ifError(error);
			done();
		});
	});
	
	it("success - default from environment API is public", function (done) {
		let res = {};
		let req = {
			getClientIP: function() {
				return "127.0.0.1"
			},
			soajs: {
				registry: {
					serviceConfig:{
						throttling: {
							"publicAPIStrategy" : "default", // can be null means throttling is off
							"privateAPIStrategy": "heavy", // can be null means throttling is off
							"default": {
								'status': 1, // 0=Off, 1=On
								'type': 1, // 0= tenant, 1= tenant -> ip
								'window': 60000,
								'limit': 50,
								'retries': 2,
								'delay': 1000
							}
						}
					}
				},
				controller: {
					serviceParams: {
						name: "test_service",
						isAPIPublic: true
					}
				},
				servicesConfig: {
				
				},
				tenant: {
					id: "123456",
					name: "TEST"
				},
				controllerResponse: function(){
				
				}
			}
		};
		var functionMw = trafficIndex({});
		functionMw(req, res, function (error) {
			assert.ifError(error);
			done();
		});
	});
	
	it("success - override at tenant level with no configuration", function (done) {
		let res = {};
		let req = {
			getClientIP: function() {
				return "127.0.0.1"
			},
			soajs: {
				registry: {
					serviceConfig:{
						throttling: {
							"publicAPIStrategy" : "default", // can be null means throttling is off
							"privateAPIStrategy": "heavy", // can be null means throttling is off
							"default": {
								'status': 1, // 0=Off, 1=On
								'type': 1, // 0= tenant, 1= tenant -> ip
								'window': 60000,
								'limit': 50,
								'retries': 2,
								'delay': 1000
							}
						}
					}
				},
				controller: {
					serviceParams: {
						name: "test_service",
						isAPIPublic: true
					}
				},
				servicesConfig: {
					"test_service": {
						SOAJS: {
							THROTTLING:{
							
							}
						}
					}
				},
				tenant: {
					id: "123456",
					name: "TEST"
				},
				controllerResponse: function(){
				
				}
			}
		};
		var functionMw = trafficIndex({});
		functionMw(req, res, function (error) {
			assert.ifError(error);
			done();
		});
	});
	
	it("success - override at tenant level", function (done) {
		let res = {};
		let req = {
			getClientIP: function() {
				return "127.0.0.1"
			},
			soajs: {
				registry: {
					serviceConfig:{
						throttling: {
							"publicAPIStrategy" : "default", // can be null means throttling is off
							"privateAPIStrategy": "heavy", // can be null means throttling is off
							"default": {
								'status': 1, // 0=Off, 1=On
								'type': 1, // 0= tenant, 1= tenant -> ip
								'window': 60000,
								'limit': 50,
								'retries': 2,
								'delay': 1000
							}
						}
					}
				},
				controller: {
					serviceParams: {
						name: "test_service",
						isAPIPublic: true
					}
				},
				servicesConfig: {
					"test_service": {
						SOAJS: {
							THROTTLING:{
								"publicAPIStrategy" : "default"
							}
						}
					}
				},
				tenant: {
					id: "123456",
					name: "TEST"
				},
				controllerResponse: function(){
				
				}
			}
		};
		var functionMw = trafficIndex({});
		functionMw(req, res, function (error) {
			assert.ifError(error);
			done();
		});
	});
	
});