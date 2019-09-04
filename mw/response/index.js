'use strict';

var soajsRes = require("./response.js");

/**
 *
 * @param configuration
 * @returns {Function}
 */
module.exports = function (configuration) {
    var errors = configuration.errors || null;
    var status = configuration.status || null;

    return function (req, res, next) {
        if (!req.soajs) {
            req.soajs = {};
        }
        req.soajs.buildResponse = function (error, data) {
            var response = null;
            if (error) {
                response = new soajsRes(false);
                if (Array.isArray(error)) {
                    var len = error.length;
                    for (var i = 0; i < len; i++) {
                        response.addErrorCode(error[i].code, error[i].msg);
                    }
                }
                else {
                    response.addErrorCode(error.code, error.msg);
                }
            }
            else {
                response = new soajsRes(true, data);
            }

            return response;
        };
        if (configuration.controllerResponse) {
            req.soajs.controllerResponse = function (jsonObj) {
                var jsonRes = jsonObj;
                if (req.soajs.buildResponse && jsonObj.code && jsonObj.msg)
                    jsonRes = req.soajs.buildResponse(jsonObj);

                var headObj = jsonObj.headObj || {};
                headObj['Content-Type'] = 'application/json';
                if (!res.headersSent) {
                    if (jsonObj.status)
                        res.writeHead(jsonObj.status, headObj);
                    else
                        res.writeHead(200, headObj);
                }
                res.end(JSON.stringify(jsonRes));
            };
        }
        else {
            req.soajs.getError = function (errorCode) {
                var errorObj = {"code": errorCode};
                if (errorCode && errors && errors[errorCode]) {
                    errorObj.msg = errors[errorCode];
                }
                if (errorCode && status && status[errorCode]) {
                    errorObj.status = status[errorCode];
                }

                return errorObj;
            };
        }
        next();
    };
};

