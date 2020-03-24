"use strict";
var assert = require("assert");
var helper = require("../../helper.js");

var utils = helper.requireModule('./utilities/utils.js');

describe("Testing utilities", function () {

    var res = {
        status: function (input) {
            return {
                send: function (input2) {
                    return input2;
                }
            };
        },
        jsonp: function () {
            return 2;
        }
    };

    var req = {
        is: () => {
            return null;
        },
        soajs: {
            log: {
                error: function (input) {
                    // console.error(input);
                }
            },
            buildResponse: function (input) {
                return input;
            },
            controllerResponse: function (input) {
                return input;
            }
        }
    };

    it("logErrors - number error", function (done) {
        utils.logErrors(123, req, res, function (error) {
            done();
        });
    });

    it("logErrors - object, no code no message", function (done) {
        utils.logErrors({}, req, res, function (error) {
            done();
        });
    });

    it("logErrors - string error", function (done) {
        utils.logErrors("error", req, res, function (error) {
            done();
        });
    });

    it("serviceClientErrorHandler - request xhr", function (done) {
        req.xhr = {};
        utils.serviceClientErrorHandler(null, req, res, (msg) => {
            console.log(msg);
        });
        done();
    });

    it("controllerClientErrorHandler - request xhr", function (done) {
        req.xhr = {};
        utils.controllerClientErrorHandler(null, req, res, (msg) => {
            console.log(msg);
        });
        done();
    });

    it("serviceErrorHandler - error no code, no message", function (done) {
        req.xhr = {};
        utils.serviceErrorHandler({}, req, res, null);
        done();
    });
});