'use strict';

var validator = require('validator');

/**
 *
 * @param result
 * @param data
 * @param serviceErrorCode
 * @constructor
 */
function response(result, data) {
    var self = this;
    if (result && typeof result !== 'boolean') {
        throw new TypeError('Result must be boolean');
    } else {
        this.result = result;
    }
    if( typeof data !== 'undefined' ) {
        this.data = data;
    }
}

/**
 *
 * @param code
 * @param message
 */
response.prototype.addErrorCode = function (code, message) {
    if (!code)
        throw new TypeError('error code is required');

    var errorCode = {
        "code" : code,
        "message" : validator.trim(message)
    };

    if (!this.errors)
        this.errors = {};

    if (!this.errors.codes)
        this.errors.codes = [];

    if (this.errors.codes.length) {
        if (this.errors.codes.some(function (e) {
                return code === e;
            }))
            return;
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

module.exports = response;
