"use strict";
var config = require("./config.js");

module.exports = {
	generate: function(errorCode) {
		var error = new Error();
		error.code = errorCode;
		error.message = config.errors[errorCode];

		return error;
	},
	getError: function(errorCode) {
		var errorObj = {"code": errorCode};
		if(errorCode && config.errors[errorCode]) {
			errorObj.msg = config.errors[errorCode];
		}
		return errorObj;
	}
};