'use strict';

const coreModules = require("soajs.core.modules");
const jsonxml = require('jsontoxml');
let core = coreModules.core;


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
        else if (err.code && err.msg) {
            err.message = err.msg;
            req.soajs.log.error(err);
            return next(err);
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
        return next(150);
        //res.status(500).send(req.soajs.buildResponse(core.error.getError(150)));
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
        let obj = req.soajs.buildResponse(err);
        if (req.is('xml')) {
            res.header('Content-Type', 'text/xml');
            let objJSON = {
                "result": obj.result,
                "errors":obj.errors
            };
            let xml = jsonxml(objJSON);
            res.end(xml);
        }
        else {
            res.jsonp(obj);
        }
    } else {
        let obj = req.soajs.buildResponse(core.error.getError(err));
        if (req.is('xml')) {
            res.header('Content-Type', 'text/xml');
            let objJSON = {
                "result": obj.result,
                "errors":obj.errors
            };
            let xml = jsonxml(objJSON);
            res.end(xml);
        }
        else {
            res.jsonp(obj);
        }
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
        let errObj = core.error.getError(150);
        errObj.status = 500;
        return next(errObj);
        //req.soajs.controllerResponse(errObj);
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
        let errObj = core.error.getError(err);
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