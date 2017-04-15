'use strict';

var MultiTenantSession = require("../../classes/MultiTenantSession");
var async = require("async");

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

    /**
     *
     * @param obj
     * @param cb
     * @returns {*}
     */
    function sessionCheck(obj, cb) {
        var mtSessionParam = {
            'session': obj.req.session,
            'tenant': {'id': obj.req.soajs.tenant.id, 'key': obj.req.soajs.tenant.key.iKey, 'extKey': obj.req.soajs.tenant.key.extKey},
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

    return function (req, res, next) {
console.log (req.route.path);
        //TODO: read the injected body as below
        var injectObj = {
            "tenant": {
                "id": "10d2cb5fc04ce51e06000001",
                "code": "test"
            },
            "key": {
                "config": {},
                "iKey": "d1eaaf5fdc35c11119330a8a0273fee9",
                "eKey": "aa39b5490c4a4ed0e56d7ec1232a428f771e8bb83cfcee16de14f735d0f5da587d5968ec4f785e38570902fd24e0b522b46cb171872d1ea038e88328e7d973ff47d9392f72b2d49566209eb88eb60aed8534a965cf30072c39565bd8d72f68ac"
            },
            "application": {
                "product": "TPROD",
                "package": "TPROD_BASIC",
                "appId": "30d2cb5fc04ce51e06000001",
                "acl": {
                    "urac": {},
                    "oauth": {},
                    "dashboard": {}
                },
                "acl_all_env": {
                    "dev": {
                        "urac": {},
                        "oauth": {},
                        "dashboard": {}
                    }
                }
            },
            "package": {
                "acl": {},
                "acl_all_env": {}
            },
            "device" : {},
            "geo" : {}
        };

        if (injectObj && injectObj.application && injectObj.application.package && injectObj.key && injectObj.tenant) {
            req.soajs.tenant = injectObj.tenant;
            req.soajs.tenant.key = {
                "iKey": injectObj.key.iKey,
                "eKey": injectObj.key.extKey
            };
            req.soajs.tenant.application = injectObj.application;

            if (injectObj.package) {
                req.soajs.tenant.application.package_acl = injectObj.package.acl;
                req.soajs.tenant.application.package_acl_all_env = injectObj.package.acl_all_env;
                req.soajs.servicesConfig = injectObj.key.config;
                req.soajs.device = injectObj.device;
                req.soajs.geo = injectObj.geo;

                var serviceCheckArray = [function (cb) {
                    cb(null, {
                        "app": app,
                        "res": res,
                        "req": req
                    });
                }];

                if (param.session)
                    serviceCheckArray.push(sessionCheck);

                async.waterfall(serviceCheckArray, function (err, data) {
                    if (err)
                        return next(err);
                    else
                        return next();
                });
            }
            else
                return next(152);
        }
        else
            return next(153);
    };
}
;
