'use strict';
var coreModules = require("soajs.core.modules");
var core = coreModules.core;

var MultiTenantSession = require("../../classes/MultiTenantSession");
var async = require("async");
var uracDriver = require("../mt/urac.js");

var regEnvironment = (process.env.SOAJS_ENV || "dev");
regEnvironment = regEnvironment.toLowerCase();

/**
 *
 * @param configuration
 * @returns {Function}
 */
module.exports = function (configuration) {
    var soajs = configuration.soajs;
    var param = configuration.param;
    var app = configuration.app;

    function mapInjectedObject(req) {

        var input = req.headers['soajsinjectobj'];
        if (typeof input === 'string') {
            input = JSON.parse(input);
        }

        if (!input) {
            return null;
        }

        var output = {};

        if (input.tenant) {
            output.tenant = {
                id: input.tenant.id,
                code: input.tenant.code,
                locked: input.tenant.locked,
                type: input.tenant.type
            };
            if (input.tenant.main)
                output.tenant.main = input.tenant.main;

            if (input.tenant.profile)
                output.tenant.profile = input.tenant.profile;
        }

        if (input.key) {
            output.key = {
                config: input.key.config,
                iKey: input.key.iKey,
                eKey: input.key.eKey
            };
        }

        if (input.application) {
            output.application = {
                product: input.application.product,
                package: input.application.package,
                appId: input.application.appId,
                acl: input.application.acl || null,
                acl_all_env: input.application.acl_all_env || null
            };
        }

        if (input.package) {
            output.package = {
                acl: input.package.acl || null,
                acl_all_env: input.package.acl_all_env || null
            };
        }

        if (input.device) {
            output.device = input.device || {};
        }

        if (input.geo) {
            output.geo = input.geo || {};
        }

        if (input.urac) {
            output.urac = input.urac || null;
        }

        if (input.param) {
            output.param = input.param || {};
        }

        if (input.awareness) {
            if (!req.soajs.awareness) {
                req.soajs.awareness = {
                    getHost: function () {
                        var serviceName, version, env, cb;
                        cb = arguments[arguments.length - 1];

                        switch (arguments.length) {
                            //controller, cb
                            case 2:
                                serviceName = arguments[0];
                                break;

                            //controller, 1, cb
                            case 3:
                                serviceName = arguments[0];
                                version = arguments[1];
                                break;

                            //controller, 1, dash, cb [dash is ignored]
                            case 4:
                                serviceName = arguments[0];
                                version = arguments[1];
                                break;
                        }

                        var host = input.awareness.host;

                        if (serviceName && serviceName.toLowerCase() !== 'controller') {
                            host += ":" + input.awareness.port + "/";
                            host += serviceName;

                            if (version) {
                                host += "v" + version + "/"
                            }
                        }

                        return cb(host);
                    }
                };
            }
        }

        return output;
    }

    /**
     *
     * @param obj
     * @param cb
     * @returns {*}
     */
    function sessionCheck(obj, cb) {
        var mtSessionParam = {
            'session': obj.req.session,
            'tenant': {
                'id': obj.req.soajs.tenant.id,
                'key': obj.req.soajs.tenant.key.iKey,
                'extKey': obj.req.soajs.tenant.key.eKey
            },
            'product': {
                'product': obj.req.soajs.tenant.application.product,
                'package': obj.req.soajs.tenant.application.package,
                'appId': obj.req.soajs.tenant.application.appId
            },
            'request': {'service': obj.app.soajs.param.serviceName, 'api': obj.req.route.path},
            'device': obj.req.soajs.device,
            'geo': obj.req.soajs.geo,
            'req': obj.req
        };
        var mtSession = new MultiTenantSession(mtSessionParam);
        obj.req.soajs.session = mtSession;
        return cb(null, obj);
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
            core.security.authorization.set(obj.res, obj.req.sessionID);
            return cb(null, obj);
        });
    }

    /**
     *
     * @param obj
     * @param cb
     */
    function uracCheck(obj, cb) {
        var urac_id = null;
        if (obj.req.soajs.urac && obj.req.soajs.urac._id)
            urac_id = obj.req.soajs.urac._id;

        obj.req.soajs.uracDriver = new uracDriver({"soajs": obj.req.soajs, "_id": urac_id});

        if (obj.req.soajs.param.urac_Profile && obj.req.soajs.param.urac_ACL) {
            obj.req.soajs.uracDriver.userRecord = obj.req.soajs.urac;
            obj.req.soajs.uracDriver.user_ACL = {"acl": obj.req.soajs.urac.acl};
        }

        obj.req.soajs.uracDriver.init(function (error, uracProfile) {
            if (error)
                obj.req.soajs.log.error(error);

            return cb(null, obj);
        });
    }

    return function (req, res, next) {

        var injectObj = mapInjectedObject(req);
        if (injectObj && injectObj.application && injectObj.application.package && injectObj.key && injectObj.tenant) {
            req.soajs.tenant = injectObj.tenant;
            req.soajs.tenant.key = {
                "iKey": injectObj.key.iKey,
                "eKey": injectObj.key.eKey
            };
            req.soajs.tenant.application = injectObj.application;
            if (injectObj.package) {
                req.soajs.tenant.application.package_acl = injectObj.package.acl;
                req.soajs.tenant.application.package_acl_all_env = injectObj.package.acl_all_env;
            }
            req.soajs.urac = injectObj.urac;
            req.soajs.servicesConfig = injectObj.key.config;
            req.soajs.device = injectObj.device;
            req.soajs.geo = injectObj.geo;
            req.soajs.param = injectObj.param;

            var serviceCheckArray = [function (cb) {
                cb(null, {
                    "app": app,
                    "res": res,
                    "req": req
                });
            }];

            if (param.session) {
                serviceCheckArray.push(sessionCheck);
                serviceCheckArray.push(persistSession);
            }

            if (param.uracDriver && req.soajs.urac)
                serviceCheckArray.push(uracCheck);

            async.waterfall(serviceCheckArray, function (err, data) {
                if (err)
                    return next(err);
                else
                    return next();
            });
        }
        else {
            if (req.soajs.registry.services[soajs.param.serviceName].extKeyRequired)
                return next(142);
            else
                return next();
        }
    };
};
