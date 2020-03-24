"use strict";

const assert = require('assert');
const helper = require("../../../helper.js");
const mw = helper.requireModule('./mw/response/index');

describe("Unit test for: mw - response", function () {
	let req = {};
	let res = {
		"writeHead": () => {
		},
		"end": () => {
		}
	};
	
	it("Install & Use the MW", function (done) {
		let mw_use = mw({
			"errors": {
				400: "Business logic required data are missing",
				601: "Model not found"
			}
		});
		mw_use(req, res, () => {
			req.soajs.buildResponse([{"code": 200, "msg": "dummy200"}, {"code": 220, "msg": "dummy220"}]);
			req.soajs.buildResponse(null, "hello world");
			let errObj = req.soajs.getError(400);
			assert.deepEqual(errObj,{ code: 400, msg: 'Business logic required data are missing' });
			done();
		});
	});
});