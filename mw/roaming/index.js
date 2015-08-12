'use strict';

var core = require('../../modules/soajs.core');
var provision = require("../../modules/soajs.provision");
var MultiTenantSession = require("../../classes/MultiTenantSession");
var async = require("async");

/**
 *
 * @param configuration
 * @returns {Function}
 */
module.exports = function (configuration) {
    var param = configuration.param;
    var app = configuration.app;

    /**
     *
     * @param obj
     * @param cb
     * @returns {*}
     */
    function sessionCheck(obj, cb) {
        var mtSessionParam = {
            'session': obj.req.session,
            'tenant': {'id': obj.keyObj.tenant.id, 'key': obj.keyObj.key, 'extKey': obj.keyObj.extKey},
            'product': {
                'product': obj.keyObj.application.product,
                'package': obj.keyObj.application.package,
                'appId': obj.keyObj.application.appId
            },
            'request': {'service': obj.app.soajs.serviceName, 'api': obj.req.path},
            'device': obj.device,
            'geo': obj.geo,
            'req': obj.req
        };
        var uracRecord = obj.req.soajs.session.getUrac();
        var mtSession = new MultiTenantSession(mtSessionParam);
        obj.req.soajs.session = mtSession;
        obj.req.soajs.session.setURAC(uracRecord, function (err){
            if(err) {
                obj.res.jsonp(obj.req.soajs.buildResponse(core.error.getError(165)));
            }
            return cb(null, obj);
        });
    }

    /**
     *
     * @param obj
     * @param cb
     */
    function persistSession(obj, cb) {
        obj.req.sessionStore.set(obj.req.sessionID, obj.req.session, function (err, data) {
            if (err) {
                obj.req.soajs.log.error(err);
                return cb(163);
            }
            return cb(null, obj);
        });
    }

    return function (req, res, next) {
        req.soajs.roaming = {};
        req.soajs.roaming.roamExtKey = function (extKey, param) {
            try {
                provision.getExternalKeyData(extKey, req.soajs.registry.serviceConfig.key, function (err, keyObj) {
                    if (keyObj && keyObj.application && keyObj.application.package) {
                        //TODO: verify if keyObj.application.package is a package in param (ie: to check if it is a dashboard package)
                        provision.getPackageData(keyObj.application.package, function (err, packObj) {
                            if (packObj) {
                                var serviceCheckArray = [function (cb) {
                                    cb(null, {
                                        "app": app,
                                        "res": res,
                                        "req": req,
                                        "keyObj": keyObj,
                                        "packObj": packObj
                                    });
                                }];
                                serviceCheckArray.push(sessionCheck);
                                serviceCheckArray.push(persistSession);

                                async.waterfall(serviceCheckArray, function (err, data) {
                                    if (err)
                                        return next(err);
                                    else
                                        return next();
                                });
                            }
                            else
                                return next(152);
                        });
                    }
                    else
                        return next(153);
                });
            } catch (err) {
                req.soajs.log.error(150, err.stack);
                res.jsonp(req.soajs.buildResponse(core.error.getError(150)));
            }
        }
    };
};
