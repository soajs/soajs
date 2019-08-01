'use strict';

var coreModules = require("soajs.core.modules");
var core = coreModules.core;

//-------------------------- ERROR Handling MW - service & controller
/**
 *
 * @param err
 * @param req
 * @param res
 * @param next
 */
function logErrors(err, req, res, next) {
    if (typeof err === "number") {
        req.soajs.log.error(core.error.generate(err));
        return next(err);
    }
    if (typeof err === "object") {
        if (err.code && err.message) {
            req.soajs.log.error(err);
            if (err.name === "OAuth2Error")
                return next({"code": err.code, "status": err.code, "msg": err.message});
            else
                return next({"code": err.code, "msg": err.message});
        }
        else {
            req.soajs.log.error(err);
            req.soajs.log.error(core.error.generate(164));
        }
    }
    else {
        req.soajs.log.error(err);
        req.soajs.log.error(core.error.generate(164));
    }

    return next(core.error.getError(164));
}

//-------------------------- ERROR Handling MW - service
/**
 *
 * @param err
 * @param req
 * @param res
 * @param next
 */
function serviceClientErrorHandler(err, req, res, next) {
    if (req.xhr) {
        req.soajs.log.error(core.error.generate(150));
        res.status(500).send(req.soajs.buildResponse(core.error.getError(150)));
    } else {
        return next(err);
    }
}

/**
 *
 * @param err
 * @param req
 * @param res
 * @param next
 */
function serviceErrorHandler(err, req, res, next) {
    if (err && err.status)
        res.status(err.status);
    else
        res.status(500);
    if (err.code && err.msg) {
        res.jsonp(req.soajs.buildResponse(err));
    } else {
        res.jsonp(req.soajs.buildResponse(core.error.getError(err)));
    }
}

//-------------------------- ERROR Handling MW - controller

/**
 *
 * @param err
 * @param req
 * @param res
 * @param next
 */
function controllerClientErrorHandler(err, req, res, next) {
    if (req.xhr) {
        req.soajs.log.error(core.error.generate(150));
        var errObj = core.error.getError(150);
        errObj.status = 500;
        req.soajs.controllerResponse(errObj);
    } else {
        return next(err);
    }
}

/**
 *
 * @param err
 * @param req
 * @param res
 * @param next
 */
function controllerErrorHandler(err, req, res, next) {
    if (err.code && err.msg) {
        err.status = err.status || 500;
        req.soajs.controllerResponse(err);
    } else {
        var errObj = core.error.getError(err);
        errObj.status = errObj.status || 500;
        req.soajs.controllerResponse(errObj);
    }
}

module.exports = {
    logErrors, // common for service and controllers
    serviceClientErrorHandler,
    serviceErrorHandler,
    controllerClientErrorHandler,
    controllerErrorHandler
};