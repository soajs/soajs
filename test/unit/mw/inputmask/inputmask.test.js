"use strict";
var assert = require("assert");
var helper = require("../../../helper.js");

var index = helper.requireModule('./mw/inputmask/inputmask.js');

describe("Testing inputmask", function () {
	
	it("Fail - Object request as a string, not as an object", function (done) {
		var obj = {
			req : "stringNotObject"
		};
		index.mapFormatAndValidate(obj, function (error) {
			assert.equal(error.code,171);
			done();
		});
	});
	
	it("Fail - Missing input mask", function (done) {
		var obj = {
			req : {},
			inputmaskSrc: ['params', 'headers', 'query', 'cookies', 'body'],
			configValidator: {
				customFormats: {},
				schemas: {
					'/soajs/Errors': "string not object",
					'/soajs/CommonFields/input': {},
					'/soajs': {}
				},
				unresolvedRefs: [],
				types: {},
				attributes: {}
			}
		};
		index.mapFormatAndValidate(obj, function (error) {
			assert.equal(error.code,171);
			done();
		});
	});
	
	it("Fail - Input mask not object", function (done) {
		var obj = {
			req : {
				params : ""
			},
			inputmaskSrc: ['params', 'headers', 'query', 'cookies', 'body'],
			configValidator: {
				customFormats: {},
				schemas: {
					'/soajs/Errors': "string not object",
					'/soajs/CommonFields/input': {},
					'/soajs': {}
				},
				unresolvedRefs: [],
				types: {},
				attributes: {}
			}
		};
		index.mapFormatAndValidate(obj, function (error) {
			assert.equal(error.code,171);
			done();
		});
	});
	
	it.skip("Pass xxx", function (done) {
		var obj = {
			req : {
				params : {},
				headers : {},
				query : {},
				cookies : {},
				body : {},
				soajs : {
					servicesConfig : {
						
					}
				}
			},
			inputmaskSrc: ['params', 'headers', 'query', 'cookies', 'body'],
			configValidator: {
				customFormats: {},
				schemas: {
					'/soajs/Errors': "string not object",
					'/soajs/CommonFields/input': {},
					'/soajs': {}
				},
				unresolvedRefs: [],
				types: {},
				attributes: {}
			},
			apiName : "example",
			config : {
				schema : {
					example : {}
				}
			}
		};
		index.mapFormatAndValidate(obj, function (error) {
			assert.equal(error.code,171);
			done();
		});
	});
});