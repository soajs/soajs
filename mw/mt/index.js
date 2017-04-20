'use strict';

var coreModules = require("soajs.core.modules");
var core = coreModules.core;
var provision = coreModules.provision;
var uracDriver = require("./urac.js");

var async = require("async");
var Netmask = require('netmask').Netmask;
var useragent = require('useragent');
var merge = require('merge');

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
	function serviceCheck(obj, cb) {
		var system = _system.getAcl(obj);
		if (system)
			return cb(null, obj);
		else
			return cb(154);
	}
	
	/**
	 *
	 * @param obj
	 * @param cb
	 * @returns {*}
	 */
	function securityGeoCheck(obj, cb) {
		var clientIp = obj.req.getClientIP();
		var geoAccess = obj.keyObj.geo; //{"allow": ["127.0.0.1"], "deny": []};
		obj.geo = {"ip": clientIp};
		
		var checkAccess = function (geoAccessArr, ip) {
			var check = geoAccessArr.some(function (addr) {
				try {
					var block = new Netmask(addr);
					return block.contains(ip);
				} catch (err) {
					obj.req.soajs.log.error('Geographic security configuration failed: ', addr);
					obj.req.soajs.log.error(err);
				}
				return false;
			});
			return check;
		};
		
		if (clientIp && geoAccess && geoAccess.deny && Array.isArray(geoAccess.deny)) {
			var denied = checkAccess(geoAccess.deny, clientIp);
			if (denied)
				return cb(155);
		}
		
		if (clientIp && geoAccess && geoAccess.allow && Array.isArray(geoAccess.allow)) {
			var allowed = checkAccess(geoAccess.allow, clientIp);
			if (!allowed)
				return cb(155);
		}
		
		return cb(null, obj);
	}
	
	/**
	 *
	 * @param obj
	 * @param cb
	 * @returns {*}
	 */
	function securityDeviceCheck(obj, cb) {
		var clientUA = obj.req.getClientUserAgent();
		var deviceAccess = obj.keyObj.device; //{"allow": [{"family": "chrome"}], "deny": []};
		obj.device = clientUA;
		
		var validateField = function (fieldName, uaObj, da) {
			if (da[fieldName] && da[fieldName] !== '*' && uaObj[fieldName]) {
				if (typeof (da[fieldName]) === 'string') {
					if (da[fieldName].trim().toUpperCase() !== uaObj[fieldName].trim().toUpperCase()) {
						return false;
					}
					if (da[fieldName].min) {
						if (da[fieldName].min.trim() > uaObj[fieldName].trim()) {
							return false;
						}
					}
				}
				if (da[fieldName].max) {
					if (da[fieldName].max.trim() < uaObj[fieldName].trim()) {
						return false;
					}
				}
			}
			return true;
		};
		
		var checkAccess = function (deviceAccessArr, ua) {
			var uaObj = useragent.lookup(ua);
			//if (uaObj && uaObj.family && uaObj.os && uaObj.os.family) {
			if (uaObj && uaObj.family) {
				var check = deviceAccessArr.some(function (da) {
					if (!da) {
						return false;
					}
					if (da.family && da.family !== '*') {
						if (da.family.trim().toUpperCase() !== uaObj.family.trim().toUpperCase()) {
							return false;
						}
					}
					if (da.os && da.os !== '*') {
						if (uaObj.os && uaObj.os.family) {
							if (uaObj.os.family.trim().toUpperCase().indexOf(da.os.family.trim().toUpperCase()) === -1) {
								return false;
							}
							if (!validateField('major', uaObj.os, da.os)) {
								return false;
							}
							if (!validateField('minor', uaObj.os, da.os)) {
								return false;
							}
							if (!validateField('patch', uaObj.os, da.os)) {
								return false;
							}
						}
						else {
							return false;
						}
					}
					if (!validateField('major', uaObj, da)) {
						return false;
					}
					if (!validateField('minor', uaObj, da)) {
						return false;
					}
					if (!validateField('patch', uaObj, da)) {
						return false;
					}
					return true;
				});
				return check;
			}
		};
		
		if (clientUA && deviceAccess && deviceAccess.deny && Array.isArray(deviceAccess.deny)) {
			var denied = checkAccess(deviceAccess.deny, clientUA);
			if (denied) {
				return cb(156);
			}
		}
		
		if (clientUA && deviceAccess && deviceAccess.allow && Array.isArray(deviceAccess.allow)) {
			var allowed = checkAccess(deviceAccess.allow, clientUA);
			if (!allowed) {
				return cb(156);
			}
		}
		
		return cb(null, obj);
	}
	
	function oauthCheck(obj, cb) {
		var oAuthTurnedOn = true;
		if (obj.soajs.oauth)
			oAuthTurnedOn = true;
		if (obj.soajs.oauthService && obj.req.soajs.controller.serviceParams.name === obj.soajs.oauthService.name && (obj.req.soajs.controller.serviceParams.path === obj.soajs.oauthService.tokenApi || obj.req.soajs.controller.serviceParams.path === obj.soajs.oauthService.authorizationApi))
			oAuthTurnedOn = false;
		
		if (oAuthTurnedOn) {
			var oauthExec = function () {
				if (obj.req.soajs.servicesConfig && obj.req.soajs.servicesConfig[obj.soajs.oauthService] && obj.req.soajs.servicesConfig[obj.soajs.oauthService].disabled)
					return cb(null, obj);
				return obj.soajs.oauth(obj.req, obj.res, function (error) {
					return cb(error, obj);
				});
			};
			
			var system = _system.getAcl(obj);
			var api = (system && system.apis ? system.apis[obj.req.soajs.controller.serviceParams.path] : null);
			if (!api && system && system.apisRegExp && Object.keys(system.apisRegExp).length) {
				for (var jj = 0; jj < system.apisRegExp.length; jj++) {
					if (system.apisRegExp[jj].regExp && obj.req.soajs.controller.serviceParams.path.match(system.apisRegExp[jj].regExp)) {
						api = system.apisRegExp[jj];
					}
				}
			}
			
			//public means:
			//-------------
			//case 0:
			//acl.systemName.access = false
			//no apiName
			//case 1:
			//acl.systemName.access = false
			//acl.systemName.apis.apiName.access = false
			//case 2:
			//acl.systemName.access = true
			//acl.systemName.apisRegExp.access = false
			//case 3:
			//acl.systemName.access = false
			//acl.systemName.apisRegExp.access = false
			//case 4:
			//acl.systemName.access = true
			//acl.systemName.apis.apiName.access = false
			//case 5:
			//acl.systemName.apisPermission = "restricted"
			//acl.systemName.apis.apiName.access = false
			
			var serviceApiPublic = false;
			if (system) {
				if (system.access) {
					if (api && !api.access)
						serviceApiPublic = true; //case 4 & case 2
				}
				else {
					if (!api || (api && !api.access))
						serviceApiPublic = true; //case 1 & case 3 & case 0
				}
				if ('restricted' === system.apisPermission) {
					if (api && !api.access)
						serviceApiPublic = true; //case 5
				}
			}
			if (serviceApiPublic) {
				if (obj.req && obj.req.query && obj.req.query.access_token)
					serviceApiPublic = false;
			}
			
			if (serviceApiPublic)
				return cb(null, obj);
			else
				return oauthExec();
		}
		else
			return cb(null, obj);
	}
	
	/**
	 *
	 * @param obj
	 * @param cb
	 * @returns {*}
	 */
	function uracCheck(obj, cb) {
		var callURACDriver = function () {
			obj.req.soajs.uracDriver = new uracDriver({"soajs": obj.req.soajs, "oauth": obj.req.oauth});
			obj.req.soajs.uracDriver.init(function (error, uracProfile) {
				if (error)
					obj.req.soajs.log.error(error);
				
				var userServiceConf = obj.req.soajs.uracDriver.getConfig();
				userServiceConf = userServiceConf || {};
				
				var tenantServiceConf = obj.keyObj.config;
				//obj.req.soajs.servicesConfig = merge.recursive(true, tenantServiceConf, userServiceConf);
				obj.servicesConfig = merge.recursive(true, tenantServiceConf, userServiceConf);
				return cb(null, obj);
			});
		};
		
		/**
		 * returns code for the requested tenant.
		 * if tenant is the same in the request, returns tenant from request
		 * @param {Function} cb
		 * @returns {*}
		 */
		var getTenantInfo = function (cb) {
			//if tenant id === client id, don't get tenant data
			if (obj.req.soajs.tenant.id === obj.req.oauth.bearerToken.clientId) {
				obj.req.soajs.log.debug("loading tenant data from req.soajs.tenant.id");
				return cb(null, obj.req.soajs.tenant);
			}
			
			obj.req.soajs.log.debug("loading tenant data from req.oauth.bearerToken.clientId");
			provision.getTenantData(obj.req.oauth.bearerToken.clientId, function (error, tenant) {
				if (error || !tenant) {
					if (!tenant) {
						error = new Error("Tenant not found for:" + obj.req.oauth.bearerToken.clientId);
					}
					obj.req.soajs.log.error(error);
					return cb(error);
				}
				
				return cb(null, tenant);
			});
		};
		
		/**
		 * load the registry of the requested environment.
		 * if environment is the same in the request, return registry from request
		 * @param {Function} cb
		 * @returns {*}
		 */
		var getEnvRegistry = function (cb) {
			//if environment is the same as regEnvironment, use it
			if (obj.req.oauth.bearerToken.env === regEnvironment) {
				obj.req.soajs.log.debug("loading env registry from req.soajs.registry");
				return cb(null, obj.req.soajs.registry);
			}
			
			obj.req.soajs.log.debug("loading env registry from req.oauth.bearerToken.env");
			core.registry.loadByEnv({"envCode": obj.req.oauth.bearerToken.env}, function (error, registry) {
				if (error || !registry) {
					if (!registry) {
						error = new Error("Registry not found for:" + obj.req.oauth.bearerToken.env);
					}
					obj.req.soajs.log.error(error);
					return cb(error);
				}
				return cb(null, registry);
			});
		};
		
		if (obj.req && obj.req.oauth && obj.req.oauth.bearerToken && obj.req.oauth.bearerToken.env === "dashboard") {
			obj.req.soajs.tenant.roaming = {
				"tId": obj.req.oauth.bearerToken.clientId,
				"user": obj.req.oauth.bearerToken.user
			};
			
			async.parallel({"tenant": getTenantInfo, "registry": getEnvRegistry}, function (error, response) {
				if (error) {
					return cb(170);
				}
				
				if (response.registry && response.registry.tenantMetaDB)
					obj.req.soajs.tenant.roaming.tenantMetaDB = response.registry.tenantMetaDB;
				obj.req.soajs.tenant.roaming.code = response.tenant.code;
				
				return callURACDriver();
			});
		}
		else {
			if (obj.req && obj.req.oauth && obj.req.oauth.bearerToken)
				return callURACDriver();
			else
				return cb(null, obj);
		}
	}
	
	/**
	 *
	 * @param obj
	 * @param cb
	 * @returns {*}
	 */
	function apiCheck(obj, cb) {
		var system = _system.getAcl(obj);
		var api = (system && system.apis ? system.apis[obj.req.soajs.controller.serviceParams.path] : null);
		if (!api && system && system.apisRegExp && Object.keys(system.apisRegExp).length) {
			for (var jj = 0; jj < system.apisRegExp.length; jj++) {
				if (system.apisRegExp[jj].regExp && obj.req.soajs.controller.serviceParams.path.match(system.apisRegExp[jj].regExp)) {
					api = system.apisRegExp[jj];
				}
			}
		}
		var apiRes = null;
		if (system && system.access) {
			if (_urac.getUser(obj.req)) {
				if (system.access instanceof Array) {
					var checkAPI = false;
					var userGroups = _urac.getGroups(obj.req);
					if (userGroups) {
						for (var ii = 0; ii < userGroups.length; ii++) {
							if (system.access.indexOf(userGroups[ii]) !== -1)
								checkAPI = true;
						}
					}
					if (!checkAPI)
						return cb(157);
				}
			} else {
				if (!api || api.access)
					return cb(158);
			}
			apiRes = _api.checkPermission(system, obj.req, api);
			if (apiRes.result)
				return cb(null, obj);
			else
				return cb(apiRes.error);
		}
		if (api || (system && ('restricted' === system.apisPermission))) {
			apiRes = _api.checkPermission(system, obj.req, api);
			if (apiRes.result)
				return cb(null, obj);
			else
				return cb(apiRes.error);
		}
		else
			return cb(null, obj);
	}
	
	/**
	 * UNDER CONSTRUCTION
	 * check if the route is an attribute route /:
	 * will be updated to behave as express
	 *
	 * @param route
	 * @returns {boolean}
	 */
	function isAttributeRoute(route) {
		if (route.includes("/:")) {
			return true;
		} else {
			return false;
		}
	}
	
	/**
	 * UNDER CONSTRUCTION
	 * fetch the attribute route and update with regular expression
	 *
	 * @param route
	 * @returns {string|*}
	 */
	function updateAttributeRoute(route) {
		var start, end;
		
		for (var i = 0; i < route.length; i++) {
			if (!start && i < route.length + 1 && route.charAt(i) === '/' && route.charAt(i + 1) === ':') {
				start = i + 2;
				i++;
			}
			if (start && !end && route.charAt(i) === '/') {
				end = i;
				break;
			}
		}
		
		if (!end) {
			end = route.length;
		}
		
		route = route.substr(0, start) + "NEW_REG_EXP_STR" + route.substr(end, route.length);
		
		return route;
	};
	
	/**
	 * UNDER CONSTRUCTION
	 * recursively, fetch object and his sub objects and replace attribute routes by reg expression
	 *
	 * @param {object} object
	 * @param {string} currentSub
	 */
	function fetchSubObjectsAndReplace(object, currentSub) {
		var current = object;
		if (currentSub) {
			current = object[currentSub];
		}
		
		// siblings, check on parent
		var siblings = Object.keys(object);
		if (currentSub && siblings.indexOf(currentSub) !== (siblings.length - 1)) {
			fetchSubObjectsAndReplace(object, siblings[siblings.indexOf(currentSub) + 1]); // go to the next bro
		}
		
		// fetch sub objects
		if (typeof current === 'object') {
			var subObjects = Object.keys(current);
			if (subObjects.length !== 0) {
				fetchSubObjectsAndReplace(current, subObjects[0]);
			}
		}
		
		// if the the route has an attribute, copy the old, update with the new key, and delete the old
		if (currentSub && isAttributeRoute(currentSub)) {
			var oldCurrentSub = currentSub;
			currentSub = updateAttributeRoute(currentSub);
			object[currentSub] = object[oldCurrentSub];
			delete object[oldCurrentSub];
		}
		
		return;
	}
	
	function filterOutRegExpObj(aclObj) {
		if (typeof aclObj === 'object' && Object.keys(aclObj).length !== 0) {
			aclObj = fetchSubObjectsAndReplace(aclObj);
		}
		
		return aclObj;
	}
	
	/**
	 *
	 * @type {{getAcl: "getAcl"}}
	 * @private
	 */
	var _system = {
		"getAcl": function (obj) {
			//TODO: transform :pathparam into apisRegExp
			var aclObj = null;
			if (obj.req.soajs.uracDriver) {
				var uracACL = obj.req.soajs.uracDriver.getAcl();
				if (uracACL)
					aclObj = uracACL[obj.req.soajs.controller.serviceParams.name];
			}
			if (!aclObj && obj.keyObj.application.acl) {
				aclObj = obj.keyObj.application.acl[obj.req.soajs.controller.serviceParams.name];
			}
			if (!aclObj && obj.packObj.acl)
				aclObj = obj.packObj.acl[obj.req.soajs.controller.serviceParams.name];
			
			if (aclObj && (aclObj.apis || aclObj.apisRegExp))
				return filterOutRegExpObj(aclObj);
			else {
				//ACL with method support restful
				var method = obj.req.method.toLocaleLowerCase();
				if (aclObj && aclObj[method] && typeof aclObj[method] === "object") {
					var newAclObj = {};
					if (aclObj.hasOwnProperty('access'))
						newAclObj.access = aclObj.access;
					if (aclObj[method].hasOwnProperty('apis'))
						newAclObj.apis = aclObj[method].apis;
					if (aclObj[method].hasOwnProperty('apisRegExp'))
						newAclObj.apisRegExp = aclObj[method].apisRegExp;
					if (aclObj[method].hasOwnProperty('apisPermission'))
						newAclObj.apisPermission = aclObj[method].apisPermission;
					else if (aclObj.hasOwnProperty('apisPermission'))
						newAclObj.apisPermission = aclObj.apisPermission;
					return filterOutRegExpObj(newAclObj);
				}
				else
					return filterOutRegExpObj(aclObj);
			}
		}
	};
	
	/**
	 *
	 * @type {{getUser: "getUser", getGroups: "getGroups"}}
	 * @private
	 */
	var _urac = {
		"getUser": function (req) {
			var urac = null;
			if (req.soajs.uracDriver)
				urac = req.soajs.uracDriver.getProfile();
			return urac;
		},
		"getGroups": function (req) {
			var groups = null;
			if (req.soajs.uracDriver)
				groups = req.soajs.uracDriver.getGroups();
			return groups;
		}
	};
	
	/**
	 *
	 * @type {{checkPermission: "checkPermission", checkAccess: "checkAccess"}}
	 * @private
	 */
	var _api = {
		"checkPermission": function (system, req, api) {
			if ('restricted' === system.apisPermission) {
				if (!api)
					return {"result": false, "error": 159};
				return _api.checkAccess(api.access, req);
			}
			if (!api)
				return {"result": true};
			return _api.checkAccess(api.access, req);
		},
		"checkAccess": function (apiAccess, req) {
			if (!apiAccess)
				return {"result": true};
			if (!_urac.getUser(req))
				return {"result": false, "error": 161};
			if (apiAccess instanceof Array) {
				var userGroups = _urac.getGroups(req);
				if (!userGroups)
					return {"result": false, "error": 160};
				for (var ii = 0; ii < userGroups.length; ii++) {
					if (apiAccess.indexOf(userGroups[ii]) !== -1)
						return {"result": true};
				}
				return {"result": false, "error": 160};
			}
			else
				return {"result": true};
		}
	};
	
	return function (req, res, next) {
		if (req.soajs.registry.services[req.soajs.controller.serviceParams.name].extKeyRequired) {
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
								
								serviceCheckArray.push(securityGeoCheck);
								serviceCheckArray.push(securityDeviceCheck);
								serviceCheckArray.push(oauthCheck);
								serviceCheckArray.push(uracCheck);
								serviceCheckArray.push(serviceCheck);
								serviceCheckArray.push(apiCheck);
								
								async.waterfall(serviceCheckArray, function (err, data) {
									if (err)
										return next(err);
									else {
										var injectObj = {
											"tenant": {
												"id": keyObj.tenant.id,
												"code": keyObj.tenant.code,
												"roaming": data.req.soajs.tenant.roaming
											},
											"key": {
												"config": data.servicesConfig || keyObj.config,
												"iKey": keyObj.key,
												"eKey": keyObj.extKey
											},
											"application": keyObj.application,
											"package": {
												"acl": packObj.acl,
												"acl_all_env": packObj.acl_all_env
											},
											"device": data.device,
											"geo": data.geo
										};
										
										if (!req.body) {
											req.body = {};
										}
										req.body.soajsInjectObj = JSON.stringify(injectObj);
										
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
				//res.jsonp(req.soajs.buildResponse(core.error.getError(150)));
			}
		}
		else {
			var oauthExec = function () {
				app.soajs.oauth(req, res, next);
			};
			return oauthExec();
		}
	};
};
