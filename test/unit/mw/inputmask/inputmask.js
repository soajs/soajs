"use strict";
/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */

const assert = require("assert");
const helper = require("../../../helper.js");

const index = helper.requireModule('./mw/inputmask/inputmask.js');

describe("Testing inputmask", function () {
	
	it("Fail - Object request as a string, not as an object", function (done) {
		let obj = {
			req: "stringNotObject"
		};
		index.mapFormatAndValidate(obj, function (error) {
			assert.equal(error.code, 171);
			done();
		});
	});
	
	it("Fail - Missing input mask", function (done) {
		let obj = {
			req: {},
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
			assert.equal(error.code, 171);
			done();
		});
	});
	
	it("Fail - Input mask not object", function (done) {
		let obj = {
			req: {
				params: ""
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
			assert.equal(error.code, 171);
			done();
		});
	});
	
	it.skip("Pass xxx", function (done) {
		let obj = {
			req: {
				params: {},
				headers: {},
				query: {},
				cookies: {},
				body: {},
				soajs: {
					servicesConfig: {}
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
			apiName: "example",
			config: {
				schema: {
					example: {}
				}
			}
		};
		index.mapFormatAndValidate(obj, function (error) {
			assert.equal(error.code, 171);
			done();
		});
	});
});