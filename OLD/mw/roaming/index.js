'use strict';

var coreModules = require ("soajs.core.modules");
var core = coreModules.core;
var Mongo = coreModules.mongo;
var provision = coreModules.provision;
var MultiTenantSession = require("../../classes/MultiTenantSession");
var async = require("async");
var utils = require ("soajs.core.libs").utils;

/**
 *
 * @param configuration
 * @returns {Function}
 */
module.exports = function (configuration) {
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
        var uracRecord = obj.req.soajs.session.getUrac(true);
        if (!uracRecord)
            return cb(core.error.getError(169), obj);
        uracRecord.roaming = {
            "tenant": obj.req.soajs.tenant
        };
        var mtSession = new MultiTenantSession(mtSessionParam);
        obj.req.soajs.session = mtSession;
        obj.req.soajs.session.setURAC(uracRecord, function (err) {
            if (err) {
                obj.req.soajs.log.error(err);
                return cb(core.error.getError(165), obj);
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
                return cb(core.error.getError(163));
            }
            return cb(null, obj);
        });
    }

    return function (req, res, next) {
        req.soajs.roaming = {};
        req.soajs.roaming.roamExtKey = function (extKey, config, cb) {
            try {
                provision.getExternalKeyData(extKey, req.soajs.registry.serviceConfig.key, function (err, keyObj) {
	                if (err) {
		                req.soajs.log.error(err);
	                }
	                if (keyObj && keyObj.application && keyObj.application.package) {
                        //TODO: verify if keyObj.application.package is a package in config (ie: to check if it is a dashboard package)
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
                                        return cb(err);
                                    else
                                        return cb();
                                });
                            }
                            else
                                return cb(core.error.getError(167));
                        });
                    }
                    else
                        return cb(core.error.getError(168));
                });
            } catch (err) {
                req.soajs.log.error(166, err.stack);
                return cb(core.error.getError(166));
            }
        };

        req.soajs.roaming.roamEnv = function (envCode, config, cb) {
            core.registry.loadByEnv({
                "envCode": envCode
            }, function (err, reg) {
                if (err){
                    req.req.soajs.log.error(err);
                    return cb(core.error.getError(170));
                }
                var uracRecord = req.soajs.session.getUrac(true);
                if (!uracRecord)
                    return cb(core.error.getError(169));
                uracRecord.roaming = {
                    "tenant": req.soajs.tenant,
                    "envFrom": req.soajs.registry.environment,
                    "envTo": envCode
                };

                var offset = reg.coreDB.session.expireAfter;
	            var cookie = utils.cloneObj(req.session.cookie);
	            cookie.domain = reg.coreDB.session.domain || null;

                var envSession = {
                    "_id": req.sessionID,
                    "session": {
	                    "cookie": cookie,
                        "sessions": {}
                    },
                    "expires" : new Date(Date.now() + offset)
                };
                envSession.session.sessions[req.soajs.tenant.id] = {"urac": uracRecord};
	            delete reg.coreDB.session.registryLocation;
                var mongo = new Mongo(reg.coreDB.session);
                mongo.insert(reg.coreDB.session.collection, envSession, function (err, record){
                    mongo.closeDb();
                    var envSoajsauth = core.security.authorization.set(null, req.sessionID);
                    envSoajsauth.envTo = envCode;
                    envSoajsauth.envFrom = req.soajs.registry.environment;
                    return cb(err, envSoajsauth);
                });
            });
        };

        return next();
    };
};
