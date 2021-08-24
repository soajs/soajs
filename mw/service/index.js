'use strict';

/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */

let MultiTenantSession = require("../../classes/MultiTenantSession");
let async = require("async");
let UracDriver = require("./urac.js");

let regEnvironment = (process.env.SOAJS_ENV || "dev");
regEnvironment = regEnvironment.toLowerCase();

/**
 *
 * @param configuration
 * @returns {Function}
 */
module.exports = function (configuration) {
	let soajs = configuration.soajs;
	let param = configuration.param;
	let app = configuration.app;
	let core = configuration.core;
	
	function mapInjectedObject(req) {
		
		let input = req.headers.soajsinjectobj;
		if (typeof input === 'string') {
			input = JSON.parse(input);
		}
		
		if (!input) {
			return null;
		}
		
		let output = {};
		
		if (input.tenant) {
			output.tenant = {
				id: input.tenant.id,
				code: input.tenant.code,
				locked: input.tenant.locked,
				type: input.tenant.type
			};
			if (input.tenant.name) {
				output.tenant.name = input.tenant.name;
			}
			if (input.tenant.main) {
				output.tenant.main = input.tenant.main;
			}
			if (input.tenant.profile) {
				output.tenant.profile = input.tenant.profile;
			}
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
		
		if (!req.soajs.awareness) {
			req.soajs.awareness = {};
			req.soajs.awareness.getHost = function () {
				let host = null;
				let serviceName = null, version = null, cb = arguments[arguments.length - 1];
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
				if (!input.awareness || !input.awareness.host) {
					return cb(host);
				}
				host = input.awareness.host;
				let gatewayServiceName = "controller";
				if (req.soajs && req.soajs.registry && req.soajs.registry.services && req.soajs.registry.services.controller && req.soajs.registry.services.controller.name) {
					gatewayServiceName = req.soajs.registry.services.controller.name;
				}
				if (serviceName && serviceName.toLowerCase() !== gatewayServiceName) {
					host += ":" + input.awareness.port + "/";
					host += serviceName;
					if (version) {
						host += "/v" + version;
					}
				} else {
					host += ":" + input.awareness.port;
				}
				return cb(host);
			};
			req.soajs.awareness.connect = function () {
				let serviceName = null, version = null, cb = arguments[arguments.length - 1];
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
				}
				let response = {};
				if (!input.awareness || !input.awareness.host) {
					return cb(response);
				}
				if (serviceName && param.interConnect && input.awareness.interConnect && Array.isArray(input.awareness.interConnect) && input.awareness.interConnect.length > 0) {
					for (let i = 0; i < input.awareness.interConnect.length; i++) {
						let serviceObj = input.awareness.interConnect[i];
						if (serviceObj.name === serviceName) {
							if (!version && serviceObj.version === serviceObj.latest) {
								response.host = serviceObj.host + ":" + serviceObj.port;
								break;
							} else if (version === serviceObj.version) {
								response.host = serviceObj.host + ":" + serviceObj.port;
								break;
							}
						}
					}
					if (response.host) {
						response.headers = {};
						response.headers.soajsinjectobj = req.headers.soajsinjectobj;
						return cb(response);
					}
				}
				if (!response.host) {
					req.soajs.awareness.getHost(serviceName, version, (host) => {
						response.host = host;
						if ((output.key && output.key.eKey) || (req.query && req.query.access_token)) {
							response.headers = {};
							if (output.key && output.key.eKey) {
								response.headers.key = output.key.eKey;
							}
							if (req.query && req.query.access_token) {
								response.headers.access_token = req.query.access_token;
							} else if (req.headers && req.headers.access_token) {
								response.headers.access_token = req.headers.access_token;
							} else if (req.headers && req.headers.Authorization) {
								response.headers.Authorization = req.headers.Authorization;
							}
						}
						return cb(response);
					});
				}
			};
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
		let mtSessionParam = {
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
		obj.req.soajs.session = new MultiTenantSession(mtSessionParam);
		return cb(null, obj);
	}
	
	/**
	 *
	 * @param obj
	 * @param cb
	 */
	function persistSession(obj, cb) {
		obj.req.sessionStore.set(obj.req.sessionID, obj.req.session, (err) => {
			if (err) {
				obj.req.soajs.log.error(err.message);
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
		obj.req.soajs.uracDriver = new UracDriver();
		
		if (obj.req.soajs.param.urac_Profile && obj.req.soajs.param.urac_ACL) {
			obj.req.soajs.uracDriver.userRecord = obj.req.soajs.urac;
			obj.req.soajs.uracDriver.user_ACL = {"acl": obj.req.soajs.urac.acl};
		}
		
		obj.req.soajs.uracDriver.init((error) => {
			if (error) {
				obj.req.soajs.log.error(error.message);
			}
			return cb(null, obj);
		});
	}
	
	return (req, res, next) => {
		let injectObj = mapInjectedObject(req);
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
			
			let serviceCheckArray = [(cb) => {
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
			
			if (param.uracDriver && req.soajs.urac) {
				serviceCheckArray.push(uracCheck);
			}
			async.waterfall(serviceCheckArray, function (err) {
				if (err) {
					return next(err);
				} else {
					return next();
				}
			});
		} else {
			if (req.soajs.registry.services[soajs.param.serviceName].extKeyRequired) {
				return next(142);
			} else {
				return next();
			}
		}
	};
};
