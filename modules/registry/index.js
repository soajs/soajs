"use strict";

/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */

const async = require('async');
const request = require('request');

let regEnvironment = (process.env.SOAJS_ENV || "dev");
regEnvironment = regEnvironment.toLowerCase();

let registry_struct = {};
registry_struct[regEnvironment] = null;

let autoReloadTimeout = {};

let modelName = "api";
if (process.env.SOAJS_SOLO && process.env.SOAJS_SOLO === "true") {
	modelName = "local";
}
const model = require("./" + modelName + ".js");

function getRegistry(param, options, cb) {
	if (options.reload || process.env.SOAJS_TEST || !registry_struct[options.envCode]) {
		model.fetchRegistry(param, options, (err, registry) => {
			if (!err && registry) {
				if (param.type && param.type === "mdaemon") {
					if (!registry.daemons) {
						registry.daemons = {};
					}
					if (!registry.daemons[param.name]) {
						registry.daemons[param.name] = {
							'group': param.group,
							'port': param.port,
							'version': param.version,
						};
					}
				} else {
					if (!registry.services) {
						registry.services = {};
					}
					if (!registry.services[param.name]) {
						registry.services[param.name] = {
							'group': param.group,
							'port': param.port,
							'version': param.version,
							'requestTimeout': param.requestTimeout,
							'requestTimeoutRenewal': param.requestTimeoutRenewal,
							'extKeyRequired': param.extKeyRequired || false
						};
					}
				}
				
				if (registry && registry.serviceConfig.awareness.autoRelaodRegistry) {
					let autoReload = () => {
						getRegistry(param, options, () => {
							// cb(err, reg);
						});
					};
					if (!autoReloadTimeout[options.envCode]) {
						autoReloadTimeout[options.envCode] = {};
					}
					if (autoReloadTimeout[options.envCode].timeout) {
						clearTimeout(autoReloadTimeout[options.envCode].timeout);
					}
					autoReloadTimeout[options.envCode].timeout = setTimeout(autoReload, registry.serviceConfig.awareness.autoRelaodRegistry);
				}
				
				registry_struct[options.envCode] = registry;
			} else {
				registry_struct[options.envCode] = null;
			}
			return cb(err, registry_struct[options.envCode]);
		});
	} else {
		return cb(null, registry_struct[options.envCode]);
	}
}

let registryModule = {
	"getCustom": (envCode) => {
		let env = envCode || regEnvironment;
		if (registry_struct[env] && registry_struct[env].custom) {
			return registry_struct[env].custom;
		} else {
			return null;
		}
	},
	"get": (envCode) => {
		let env = envCode || regEnvironment;
		if (registry_struct[env]) {
			return registry_struct[env];
		} else {
			return null;
		}
	},
	"load": (param, cb) => {
		let options = {
			"reload": false,
			"envCode": regEnvironment
		};
		return getRegistry(param, options, (err, reg) => {
			if (err) {
				throw new Error('Unable to load Registry Db Info: ' + err.message);
			} else {
				return cb(reg);
			}
		});
	},
	"reload": (param, cb) => {
		let options = {
			"reload": true,
			"envCode": regEnvironment
		};
		getRegistry(param, options, (err, reg) => {
			cb(err, reg);
			let envArray = [];
			for (let envCode in registry_struct) {
				if (registry_struct.hasOwnProperty(envCode)) {
					if (envCode !== regEnvironment && registry_struct[envCode]) {
						envArray.push({"options": {"reload": true, "envCode": envCode}, "param": param});
					}
				}
			}
			if (envArray.length > 0) {
				async.mapSeries(envArray, (a) => {
					getRegistry(a.param, a.options);
				}, () => {
				});
			}
		});
	},
	"autoRegisterService": (param, cb) => {
		let controllerSRV = registry_struct[regEnvironment].services.controller;
		if (controllerSRV && controllerSRV.hosts && controllerSRV.hosts.latest && controllerSRV.hosts[controllerSRV.hosts.latest]) {
			async.each(controllerSRV.hosts[controllerSRV.hosts.latest],
				(ip, callback) => {
					let requestOptions = {
						'uri': 'http://' + ip + ':' + (controllerSRV.port + registry_struct[regEnvironment].serviceConfig.ports.maintenanceInc) + '/register',
						"json": true,
						"method": "post"
					};
					requestOptions.qs = {};
					requestOptions.body = param;
					/*
					requestOptions.body = {
						"name": param.name,
						"description": param.description,
						"type": param.type,
						"subType": param.subType,
						"group": param.group,
						"port": param.port,
						"portHost": param.portHost,
						"ip": param.ip,
						"version": param.version,
						"maintenance": param.maintenance
					};
					
					if (param.type === "mdaemon") {
						requestOptions.body.jobList = param.jobList;
					} else {
						requestOptions.body.oauth = param.oauth;
						requestOptions.body.urac = param.urac;
						requestOptions.body.urac_Profile = param.urac_Profile;
						requestOptions.body.urac_ACL = param.urac_ACL;
						requestOptions.body.urac_Config = param.urac_Config;
						requestOptions.body.urac_GroupConfig = param.urac_GroupConfig;
						requestOptions.body.tenant_Profile = param.tenant_Profile;
						requestOptions.body.provision_ACL = param.provision_ACL;
						requestOptions.body.extKeyRequired = param.extKeyRequired;
						requestOptions.body.requestTimeout = param.requestTimeout;
						requestOptions.body.requestTimeoutRenewal = param.requestTimeoutRenewal;
						requestOptions.body.interConnect = param.interConnect;
						requestOptions.body.apiList = param.apiList;
						
						requestOptions.body.mw = param.mw;
					}
					*/
					if (param.serviceHATask) {
						requestOptions.qs.serviceHATask = param.serviceHATask;
					}
					request(requestOptions, (error) => {
						return (error) ? callback(error) : callback(null);
					});
					
				}, (err) => {
					return (err) ? cb(err, false) : cb(null, true);
				});
		} else {
			return cb(new Error("Unable to find any controller host"), false);
		}
	},
	"loadByEnv": (param, cb) => {
		let options = {
			"reload": true,
			"envCode": param.envCode.toLowerCase()
		};
		if (options.envCode === regEnvironment && registry_struct[options.envCode]) {
			return cb(null, registry_struct[options.envCode])
		}
		if (!param.hasOwnProperty("donotBbuildSpecificRegistry")) {
			options.donotBbuildSpecificRegistry = true;
		}
		return getRegistry(param, options, (err, reg) => {
			if (err) {
				return cb(err);
			}
			return cb(null, reg);
		});
	}
};

module.exports = registryModule;