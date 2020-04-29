'use strict';

/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */

/**
 *
 * @param result
 * @param data
 * @constructor
 */
function Response(result, data) {
	if (result && typeof result !== 'boolean') {
		throw new TypeError('Result must be boolean');
	} else {
		this.result = result;
	}
	if (typeof data !== 'undefined') {
		this.data = data;
	}
}

/**
 *
 * @param code
 * @param message
 */
Response.prototype.addErrorCode = function (code, message) {
	if (!code) {
		throw new TypeError('error code is required');
	}
	let errorCode = {
		"code": code,
		"message": message.trim()
	};
	
	if (!this.errors) {
		this.errors = {};
	}
	if (!this.errors.codes) {
		this.errors.codes = [];
	}
	if (this.errors.codes.length) {
		if (this.errors.codes.some((e) => {
			return code === e;
		})) {
			return;
		}
	}
	this.errors.codes.push(errorCode.code);
	this.errors.codes.sort();
	if (errorCode.message) {
		if (!this.errors.details) {
			this.errors.details = [];
		}
		this.errors.details.push(errorCode);
	}
};

module.exports = Response;
