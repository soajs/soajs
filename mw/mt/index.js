'use strict';

var coreModules = require("soajs.core.modules");
var core = coreModules.core;
var provision = coreModules.provision;

var async = require("async");

var regEnvironment = (process.env.SOAJS_ENV || "dev");
regEnvironment = regEnvironment.toLowerCase();

var utils = require("./utils");

/**
 *
 * @param configuration
 * @returns {Function}
 */
module.exports = function (configuration) {
    var soajs = configuration.soajs;
    var param = configuration.param;
    var app = configuration.app;

    return function (req, res, next) {
        /**
         *    TODO: the below are the params that we should turn on per service per env to populate injectObj upon
         *        urac
         *        urac_Profile
         *        urac_ACL
         *        provision_ACL
         *        extKeyRequired ? maybe
         *        oauth
         */
        var serviceInfo = req.soajs.controller.serviceParams.registry.versions[req.soajs.controller.serviceParams.version];
        if (!serviceInfo) {
            return next(133);
        }

        //if there is a proxy no need to do any of the below, return next
        var proxyInfo = req.soajs.controller.serviceParams.serviceInfo;
        var proxy = (proxyInfo[1] === 'proxy' && proxyInfo[2] === 'redirect');
        var keyPermissionGet = (proxyInfo[1] === 'key' && proxyInfo[2] === 'permission' && proxyInfo[3] === 'get');

        var oauth = true;
        if (Object.hasOwnProperty.call(serviceInfo, 'oauth')) {
            oauth = serviceInfo.oauth;
        }
        var serviceParam = {
            "urac": serviceInfo.urac || false,
            "urac_Profile": serviceInfo.urac_Profile || false,
            "urac_ACL": serviceInfo.urac_ACL || false,
            "urac_Config": serviceInfo.urac_Config || false,
            "urac_GroupConfig": serviceInfo.urac_GroupConfig || false,
            "provision_ACL": serviceInfo.provision_ACL || false,
            "extKeyRequired": serviceInfo.extKeyRequired || false,
            "oauth": oauth
        };

        //if (serviceInfo.hasOwnProperty("oauth"))
        //    serviceParam.oauth = serviceInfo.oauth;

        if (serviceInfo[regEnvironment]) {
            if (serviceInfo[regEnvironment].hasOwnProperty("extKeyRequired"))
                serviceParam.extKeyRequired = serviceInfo[regEnvironment].extKeyRequired;
            if (serviceInfo[regEnvironment].hasOwnProperty("oauth"))
                serviceParam.oauth = serviceInfo[regEnvironment].oauth;
        }

        if (proxyInfo[2] === "swagger" && proxyInfo[proxyInfo.length - 1] === proxyInfo[2])
            return next();

        req.soajs.awareness.getHost('controller', function (controllerHostInThisEnvironment) {
            if (serviceParam.extKeyRequired) {
                req.soajs.controller.serviceParams.isAPIPublic = false;
                try {
                    let keyObj = req.soajs.controller.serviceParams.keyObj;

                    if (keyObj && keyObj.application && keyObj.application.package) {
                        req.soajs.tenant = keyObj.tenant;
                        req.soajs.tenant.key = {
                            "iKey": keyObj.key,
                            "eKey": keyObj.extKey
                        };

                        provision.getTenantOauth(req.soajs.tenant.id, (err, tenantOauth) => {
                            if (tenantOauth)
                                req.soajs.tenantOauth = tenantOauth;
                            else
                                req.soajs.tenantOauth = null;

                            req.soajs.tenant.application = keyObj.application;

                            let packObj = req.soajs.controller.serviceParams.packObj;
                            if (packObj) {
                                req.soajs.tenant.application.package_acl = packObj.acl;
                                req.soajs.tenant.application.package_acl_all_env = packObj.acl_all_env;
                                req.soajs.servicesConfig = keyObj.config;

                                if (proxy) {
                                    req.soajs.log.debug("Detected proxy request, bypassing MT ACL checks...");
                                    return next();
                                }

                                var serviceCheckArray = [function (cb) {
                                    cb(null, {
                                        "app": app,
                                        "soajs": soajs,
                                        "res": res,
                                        "req": req,
                                        "keyObj": keyObj,
                                        "packObj": packObj
                                    });
                                }];

                                serviceCheckArray.push(utils.securityGeoCheck);
                                serviceCheckArray.push(utils.securityDeviceCheck);

                                serviceCheckArray.push(utils.aclCheck);

                                if (serviceParam.oauth) {
                                    serviceCheckArray.push(utils.oauthCheck);
                                }

                                serviceCheckArray.push(utils.uracCheck);
                                serviceCheckArray.push(utils.aclUrackCheck);

                                serviceCheckArray.push(utils.serviceCheck);
                                serviceCheckArray.push(utils.apiCheck);

                                async.waterfall(serviceCheckArray, function (err, data) {

                                    //if this is controller route: /key/permission/get, ignore async waterfall response
                                    if (keyPermissionGet) {
                                        if (!req.soajs.uracDriver) {
                                            //doesn't work if you are not logged in
                                            return next(158);
                                        }
                                        else {
                                            req.soajs.log.debug("Detected return get key permission request, bypassing MT ACL checks...");
                                            return next();
                                        }
                                    }

                                    if (err)
                                        return next(err);
                                    else {
                                        var serviceName = data.req.soajs.controller.serviceParams.name;
                                        var dataServiceConfig = data.servicesConfig || keyObj.config;
                                        var serviceConfig = {};

                                        if (dataServiceConfig.commonFields) {
                                            for (var i in dataServiceConfig.commonFields) {
                                                //if servicesConfig already has an entry, entry overrides commonFields
                                                if (!serviceConfig[i]) {
                                                    serviceConfig[i] = dataServiceConfig.commonFields[i];
                                                }
                                            }
                                        }

                                        if (dataServiceConfig[serviceName]) {
                                            serviceConfig[serviceName] = dataServiceConfig[serviceName];
                                        }

                                        var injectObj = {
                                            "tenant": {
                                                "id": keyObj.tenant.id,
                                                "code": keyObj.tenant.code,
                                                "locked": keyObj.tenant.locked,
                                                "roaming": data.req.soajs.tenant.roaming
                                            },
                                            "key": {
                                                /*
                                                 do not send the servicesConfig as it is, it should only send the service and commonFields
                                                 ex:
                                                 serviceConfig = {
                                                 commonFields : { .... },
                                                 [serviceName] : { .... }
                                                 }
                                                 */
                                                "config": serviceConfig,
                                                "iKey": keyObj.key,
                                                "eKey": keyObj.extKey
                                            },
                                            "application": {
                                                "product": keyObj.application.product,
                                                "package": keyObj.application.package,
                                                "appId": keyObj.application.appId,
                                                "acl": keyObj.application.acl,
                                                "acl_all_env": keyObj.application.acl_all_env
                                            },
                                            "package": {
                                                "acl": packObj.acl,
                                                "acl_all_env": packObj.acl_all_env
                                            },
                                            "device": data.device,
                                            "geo": data.geo
                                        };

                                        if (controllerHostInThisEnvironment) {
                                            injectObj.awareness = {
                                                "host": controllerHostInThisEnvironment,
                                                "port": req.soajs.registry.serviceConfig.ports.controller
                                            };
                                        }
                                        if (req.soajs.uracDriver) {
                                            if (serviceParam.urac) {
                                                var uracObj = req.soajs.uracDriver.getProfile((serviceParam.urac_Config || serviceParam.urac_GroupConfig));
                                                if (uracObj) {
                                                    injectObj.urac = {
                                                        "_id": uracObj._id,
                                                        "username": uracObj.username,
                                                        "firstName": uracObj.firstName,
                                                        "lastName": uracObj.lastName,
                                                        "email": uracObj.email,
                                                        "groups": uracObj.groups,
                                                        "socialLogin": uracObj.socialLogin,
                                                        "tenant": {
                                                            "id": uracObj.tenant.id,
                                                            "code": uracObj.tenant.code
                                                        }
                                                    };

                                                    injectObj.param = injectObj.param || {};
                                                    injectObj.param.urac_Profile = serviceParam.urac_Profile;
                                                    injectObj.param.urac_ACL = serviceParam.urac_ACL;

                                                    if (serviceParam.urac_Profile)
                                                        injectObj.urac.profile = uracObj.profile;
                                                    if (serviceParam.urac_ACL)
                                                        injectObj.urac.acl = null;//req.soajs.uracDriver.getAcl();
                                                    if (serviceParam.urac_ACL)
                                                        injectObj.urac.acl_AllEnv = null;//req.soajs.uracDriver.getAclAllEnv();
                                                    console.log(serviceParam)
                                                    console.log(JSON.stringify(uracObj))
                                                    if (serviceParam.urac_Config) {
                                                        injectObj.urac.config = uracObj.config;
                                                    }
                                                    if (serviceParam.urac_GroupConfig) {
                                                        injectObj.urac.groupsConfig = uracObj.groupsConfig;
                                                    }
                                                }
                                            }
                                        }
                                        if (!serviceParam.provision_ACL) {
                                            delete injectObj.application.acl;
                                            delete injectObj.application.acl_all_env;
                                            delete injectObj.package.acl_all_env;
                                            delete injectObj.package.acl;
                                        }

                                        req.headers['soajsinjectobj'] = JSON.stringify(injectObj);
                                        return next();
                                    }
                                });
                            }
                            else
                                return next(152);

                        });
                    }
                    else
                        return next(153);

                } catch (err) {
                    req.soajs.log.error(150, err.stack);
                    req.soajs.controllerResponse(core.error.getError(150));
                }
            }
            else {
                req.soajs.controller.serviceParams.isAPIPublic = true;

                if (serviceParam.oauth) {
                    var oauthExec = function () {
                        soajs.oauth(req, res, next);
                    };
                    if (soajs.oauthService && req.soajs.controller.serviceParams.name === soajs.oauthService.name && (req.soajs.controller.serviceParams.path === soajs.oauthService.tokenApi || req.soajs.controller.serviceParams.path === soajs.oauthService.authorizationApi))
                        return next();
                    else
                        return oauthExec();
                }
                else
                    return next();
            }
        });
    };
};
