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
         *	TODO: the below are the params that we should turn on per service per env to populate injectObj upon
         * 		urac
         * 		urac_Profile
         * 		urac_ACL
         * 		urac_AllEnvACL
         * 		package_ACL
         * 		package_AllEnvACL
         * 		application_ACL
         * 		application_AllEnvACL
		 * 		extKeyRequired ? maybe
		 * 		oauth
         */
        var serviceInfo = req.soajs.controller.serviceParams.registry.versions[req.soajs.controller.serviceParams.version];
		var serviceParam = {
			"urac" : serviceInfo.urac || false,
            "urac_Profile" : serviceInfo.urac_Profile || false,
            "urac_ACL" : serviceInfo.urac_ACL || false,
            "urac_AllEnvACL" : serviceInfo.urac_AllEnvACL || false,
            "package_ACL" : serviceInfo.package_ACL || false,
            "package_AllEnvACL" : serviceInfo.package_AllEnvACL || false,
            "application_ACL" : serviceInfo.application_ACL || false,
            "application_AllEnvACL" : serviceInfo.application_AllEnvACL || false,
            "extKeyRequired" : serviceInfo.extKeyRequired || false,
            "oauth" : serviceInfo.oauth || true
		};
		if (serviceInfo[regEnvironment]){
			if (serviceInfo[regEnvironment].hasOwnProperty("urac"))
                serviceParam.urac = serviceInfo[regEnvironment].urac;
            if (serviceInfo[regEnvironment].hasOwnProperty("urac_Profile"))
                serviceParam.urac_Profile = serviceInfo[regEnvironment].urac_Profile;
            if (serviceInfo[regEnvironment].hasOwnProperty("urac_ACL"))
                serviceParam.urac_ACL = serviceInfo[regEnvironment].urac_ACL;
            if (serviceInfo[regEnvironment].hasOwnProperty("urac_AllEnvACL"))
                serviceParam.urac_AllEnvACL = serviceInfo[regEnvironment].urac_AllEnvACL;
            if (serviceInfo[regEnvironment].hasOwnProperty("package_ACL"))
                serviceParam.package_ACL = serviceInfo[regEnvironment].package_ACL;
            if (serviceInfo[regEnvironment].hasOwnProperty("package_AllEnvACL"))
                serviceParam.package_AllEnvACL = serviceInfo[regEnvironment].package_AllEnvACL;
            if (serviceInfo[regEnvironment].hasOwnProperty("application_ACL"))
                serviceParam.application_ACL = serviceInfo[regEnvironment].application_ACL;
            if (serviceInfo[regEnvironment].hasOwnProperty("application_AllEnvACL"))
                serviceParam.application_AllEnvACL = serviceInfo[regEnvironment].application_AllEnvACL;
            if (serviceInfo[regEnvironment].hasOwnProperty("extKeyRequired"))
                serviceParam.extKeyRequired = serviceInfo[regEnvironment].extKeyRequired;
            if (serviceInfo[regEnvironment].hasOwnProperty("oauth"))
                serviceParam.oauth = serviceInfo[regEnvironment].oauth;
		}
		if (serviceParam.extKeyRequired) {
			try {
				provision.getExternalKeyData(req.get("key"), req.soajs.registry.serviceConfig.key, function (err, keyObj) {
					if (err)
						req.soajs.log.warn(err);
					if (keyObj && keyObj.application && keyObj.application.package) {
						req.soajs.tenant = keyObj.tenant;
						req.soajs.tenant.key = {
							"iKey": keyObj.key,
							"eKey": keyObj.extKey
						};
						req.soajs.tenant.application = keyObj.application;
						provision.getPackageData(keyObj.application.package, function (err, packObj) {
							if (err)
								req.soajs.log.warn(err);
							if (packObj) {
								req.soajs.tenant.application.package_acl = packObj.acl;
								req.soajs.tenant.application.package_acl_all_env = packObj.acl_all_env;
								req.soajs.servicesConfig = keyObj.config;
								
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
								serviceCheckArray.push(utils.oauthCheck);
								serviceCheckArray.push(utils.uracCheck);
								serviceCheckArray.push(utils.serviceCheck);
								serviceCheckArray.push(utils.apiCheck);
								
								async.waterfall(serviceCheckArray, function (err, data) {
									if (err)
										return next(err);
									else {
										var serviceName = data.req.soajs.controller.serviceParams.name;
										var dataServiceConfig = data.servicesConfig || keyObj.config;
										var serviceConfig = {};
										
										if(dataServiceConfig.commonFields){
											for (var i in dataServiceConfig.commonFields){
												//if servicesConfig already has an entry, entry overrides commonFields
												if(!serviceConfig[i]){
													serviceConfig[i] = dataServiceConfig.commonFields[i];
												}
											}
										}
										
										if(dataServiceConfig[serviceName]){
											serviceConfig[serviceName] = dataServiceConfig[serviceName];
										}
										
										var injectObj = {
											"tenant": {
												"id": keyObj.tenant.id,
												"code": keyObj.tenant.code,
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

										if (req.soajs.uracDriver)
                                            injectObj.urac = req.soajs.uracDriver.getProfile();

										if(serviceName.toLowerCase() !== 'dashboard'){
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
				});
			} catch (err) {
				req.soajs.log.error(150, err.stack);
				req.soajs.controllerResponse(core.error.getError(150));
			}
		}
		else {
			if (serviceParam.oauth) {
                var oauthExec = function () {
                    soajs.oauth(req, res, next);
                };
                return oauthExec();
            }
            else
            	return next ();
		}
	};
};
