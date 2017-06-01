"use strict";
var assert = require("assert");
var helper = require("../../../helper.js");

var utils = helper.requireModule('./mw/mt/utils.js');

describe("testing utils", function () {
	
	it("test serviceCheck - no api no apisRegExp", function (done) {
		var obj = {
			req: {
				soajs:{
					controller : {
						serviceParams : {
							name : "test"
						}
					}
				},
				method : "test"
			},
			keyObj : {
				application :{
					acl:{
						test:{
							access : true,
							apis : false,
							apisRegExp : false,
							apisPermission : true,
							test:{
								ssss : "ssss"
							}
						},
						access : false
					}
				}
			},
			packObj:{
				
			}
		};
		utils.serviceCheck(obj, function (body) {
			assert.ok(true);
			done();
		});
	});
	
	it("test serviceCheck - with an attribute route", function (done) {
		var obj = {
			req: {
				soajs:{
					controller : {
						serviceParams : {
							name : "test"
						}
					}
				},
				method : "test"
			},
			keyObj : {
				application :{
					acl:{
						test:{
							"apis": {
								"/categories": {},
								"/products": {},
								"/product/:serial": {},
								"/featuredProducts": {},
								"/merchants": {}
							},
							apisRegExp : false,
							apisPermission : true,
							test:{
								ssss : "ssss"
							}
						},
						access : false
					}
				}
			},
			packObj:{
				
			}
		};
		utils.serviceCheck(obj, function (body) {
			assert.ok(true);
			done();
		});
	});
	
	it("test apiCheck - api reg exp", function (done) {
		var obj = {
			req: {
				soajs:{
					controller : {
						serviceParams : {
							name : "test",
							path : "lolaa"
						}
					}
				},
				method : "test"
			},
			keyObj : {
				application :{
					acl:{
						test:{
							apisRegExp : [
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
						access : false
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
				getClientUserAgent : function(){
					return "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36";
				},
				soajs:{
					controller : {
						serviceParams : {
							name : "test",
							path : "lolaa"
						}
					}
				},
				method : "test"
			},
			keyObj : {
				device :{"allow": [{"family": "chrome"}], "deny": [
					{
						family:'*',
						os : {
							family : 'major'
						}
					}
				]}
			}
		};
		utils.securityDeviceCheck(obj, function (body) {
			assert.ok(true);
			done();
		});
	});
	
});


