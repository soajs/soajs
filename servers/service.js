'use strict';

/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */

const os = require('os');
const fs = require('fs');

const coreModules = require("soajs.core.modules");
const core = coreModules.core;
const lib = require("soajs.core.libs");

const express = require('express');

const utils = require("./../utilities/utils");
const registryModule = require("./../modules/registry");

let autoRegHost = process.env.SOAJS_SRV_AUTOREGISTERHOST || true;
if (autoRegHost && typeof(autoRegHost) !== 'boolean') {
	autoRegHost = (autoRegHost === 'true');
}
let manualdeploy = !!process.env.SOAJS_DEPLOY_MANUAL;

function Service(param) {
	let _self = this;
	
	//NOTE: added this to trigger a warning if someone is still using old style configuration
	if (!param) {
		param = {"oldStyleConfiguration": false};
	}
	if (param && param.config && param.config.serviceName) {
		param.oldStyleConfiguration = true;
		for (let configParam in param.config) {
			if (Object.hasOwnProperty.call(param.config, configParam)) {
				param[configParam] = param.config[configParam];
			}
		}
		delete param.config;
	}
	if (process.env.SOAJS_SOLO && process.env.SOAJS_SOLO === "true") {
		param.extKeyRequired = false;
		param.session = false;
	}
	
	let defaultParam = ["bodyParser", "methodOverride", "cookieParser", "inputmask"];
	let len = defaultParam.length;
	for (let i = 0; i < len; i++) {
		if (!Object.hasOwnProperty.call(param, defaultParam[i])) {
			param[defaultParam[i]] = true;
		}
	}
	param.mw = manualdeploy;
	
	let soajs = {};
	soajs.param = param;
	_self.app = express();
	_self.appMaintenance = express();
	
	_self.app.soajs = soajs;
}

Service.prototype.init = function (callback) {
	let _self = this;
	let registry = null;
	let soajs = _self.app.soajs;
	
	soajs.param.type = soajs.param.type.toLowerCase();
	
	soajs.param.serviceName = soajs.param.serviceName.toLowerCase();
	soajs.param.serviceGroup = soajs.param.serviceGroup || "No Group Service";
	soajs.param.serviceVersion = "" + (soajs.param.serviceVersion || 1);
	
	if (!lib.version.validate(soajs.param.serviceVersion)) {
		throw new Error('Service version must be of format [1.1]: [' + soajs.param.serviceVersion + ']');
	}
	
	soajs.param.servicePort = soajs.param.servicePort || null;
	soajs.param.extKeyRequired = soajs.param.extKeyRequired || false;
	soajs.param.requestTimeout = soajs.param.requestTimeout || null;
	soajs.param.requestTimeoutRenewal = soajs.param.requestTimeoutRenewal || null;
	soajs.param.serviceIp = process.env.SOAJS_SRVIP || null;
	soajs.param.serviceHATask = null;
	soajs.param.swagger = soajs.param.swagger || false;
	soajs.param.swaggerFilename = soajs.param.swaggerFilename || 'swagger.yml';
	soajs.param.urac = soajs.param.urac || false;
	soajs.param.urac_Profile = soajs.param.urac_Profile || false;
	soajs.param.urac_ACL = soajs.param.urac_ACL || false;
	soajs.param.urac_Config = soajs.param.urac_Config || false;
	soajs.param.urac_GroupConfig = soajs.param.urac_GroupConfig || false;
	soajs.param.tenant_Profile = soajs.param.tenant_Profile || false;
	soajs.param.provision_ACL = soajs.param.provision_ACL || false;
	soajs.param.interConnect = soajs.param.interConnect || null;
	if (!soajs.param.hasOwnProperty("oauth")) {
		soajs.param.oauth = true;
	}
	
	let fetchedHostIp = null;
	let serviceIpNotDetected = false;
	if (!autoRegHost && !process.env.SOAJS_DEPLOY_HA) {
		soajs.param.serviceIp = '127.0.0.1';
	}
	let loadVersion = () => {
		let version = {};
		let core_packageJson = require("./../package.json");
		if (core_packageJson && core_packageJson.version) {
			version.core = core_packageJson.version;
		}
		if (soajs.param && soajs.param.packagejson) {
			if (soajs.param.packagejson.version) {
				version.service = soajs.param.packagejson.version;
			}
			if (soajs.param.packagejson.dependencies) {
				version.dependencies = soajs.param.packagejson.dependencies;
			}
		} else {
			if (fs.existsSync(process.cwd() + "/package.json")) {
				let service_packageJson = require(process.cwd() + "/package.json");
				if (service_packageJson) {
					if (service_packageJson.version) {
						version.service = service_packageJson.version;
					}
					if (service_packageJson.dependencies) {
						version.dependencies = service_packageJson.dependencies;
					}
				}
			}
		}
		return version;
	};
	let versions = loadVersion();
	_self.maintenanceResponse = (req, route) => {
		let response = {
			'result': false,
			'ts': Date.now(),
			'service': {
				'service': _self.app.soajs.param.serviceName.toUpperCase(),
				'type': 'rest',
				'route': route || req.path
			}
		};
		response.versions = versions;
		
		return response;
	};
	if (!soajs.param.serviceIp && !process.env.SOAJS_DEPLOY_HA) {
		core.getHostIp(function (getHostIpResponse) {
			fetchedHostIp = getHostIpResponse;
			if (fetchedHostIp && fetchedHostIp.result) {
				soajs.param.serviceIp = fetchedHostIp.ip;
				if (fetchedHostIp.extra && fetchedHostIp.extra.swarmTask) {
					soajs.param.serviceHATask = fetchedHostIp.extra.swarmTask;
				}
			} else {
				serviceIpNotDetected = true;
				soajs.param.serviceIp = "127.0.0.1";
			}
			resume();
		});
	} else {
		resume();
	}
	
	function resume() {
		soajs.apiList = utils.extractAPIsList(soajs.param.schema);
		
		registryModule.load({
			"type": soajs.param.type,
			"name": soajs.param.serviceName,
			"group": soajs.param.serviceGroup,
			"port": soajs.param.servicePort,
			"version": soajs.param.serviceVersion,
			"requestTimeout": soajs.param.requestTimeout,
			"requestTimeoutRenewal": soajs.param.requestTimeoutRenewal,
			"extKeyRequired": soajs.param.extKeyRequired
		}, function (reg) {
			registry = reg;
			
			soajs.serviceConf = lib.registry.getServiceConf(soajs.param.serviceName, registry);
			
			_self.log = core.getLogger(soajs.param.serviceName, registry.serviceConfig.logger);
			
			//turn on swagger path
			if (fs.existsSync('./' + soajs.param.swaggerFilename)) {
				_self.app.get('/swagger', function (req, res) {
					let swaggerFile = fs.readFileSync('./' + soajs.param.swaggerFilename, {'encoding': 'utf8'});
					res.setHeader('Content-Type', 'text/yaml');
					res.send(swaggerFile);
				});
				_self.log.info("Swagger route [/swagger] is ON.");
			}
			
			if (process.env.SOAJS_SOLO && process.env.SOAJS_SOLO === "true") {
				_self.log.info("SOAJS is in SOLO mode, the following got turned OFF [extKeyRequired, session, oauth].");
			}
			if (soajs.param.oldStyleConfiguration) {
				_self.log.warn("Old style configuration detected. Please start using the new way of passing param when creating a new service.");
			}
			_self.log.info("Registry has been loaded successfully from environment: " + registry.environment);
			
			if (fetchedHostIp) {
				if (!fetchedHostIp.result) {
					_self.log.warn("Unable to find the service host ip. The service will NOT be registered for awareness.");
					_self.log.info("IPs found: ", fetchedHostIp.extra.ips);
					if (serviceIpNotDetected) {
						_self.log.warn("The default service IP has been used [" + soajs.param.serviceIp + "]");
					}
				} else {
					_self.log.info("The IP registered for service [" + soajs.param.serviceName + "] awareness : ", fetchedHostIp.ip);
				}
			}
			
			if (!soajs.param.serviceName || !soajs.serviceConf) {
				if (!soajs.param.serviceName) {
					_self.log.error('Service failed to start, serviceName is empty [' + soajs.param.serviceName + ']');
				} else {
					_self.log.error('Service [' + soajs.param.serviceName + '] failed to start. Unable to find the service entry in registry');
				}
				return callback(new Error("Service shutdown due to failure!"));
			}
			
			// Registry now is loaded and all param are assured
			
			_self.log.info("Service middleware initialization started...");
			
			let soajs_mw = require("./../mw/soajs/index");
			_self.app.use(soajs_mw({
				"log": _self.log,
				"core": core
			}));
			
			let response_mw = require("./../mw/response/index");
			_self.app.use(response_mw({"errors": soajs.param.errors, "status": soajs.param.status}));
			
			if (soajs.param.bodyParser) {
				let bodyParser = require('body-parser');
				let options = (soajs.param.bodyParser.limit) ? {limit: soajs.param.bodyParser.limit} : null;
				_self.app.use(express.json(options));
				_self.app.use(express.urlencoded({extended: true}));
				_self.log.info("Body-Parse middleware initialization done.");
			} else {
				_self.log.info("Body-Parser middleware initialization skipped.");
			}
			
			if (soajs.param.methodOverride) {
				let methodOverride = require('method-override');
				_self.app.use(methodOverride());
				_self.log.info("Method-Override middleware initialization done.");
			} else {
				_self.log.info("Method-Override middleware initialization skipped.");
			}
			
			if (soajs.param.cookieParser) {
				let cookieParser = require('cookie-parser');
				_self.app.use(cookieParser(soajs.serviceConf._conf.cookie.secret));
				_self.log.info("CookieParser middleware initialization done.");
			} else {
				_self.log.info("CookieParser middleware initialization skipped.");
			}
			
			if (soajs.param.session) {
				let session = require('express-session');
				let MongoStore = coreModules.mongoStore(session);
				let store = new MongoStore(registry.coreDB.session);
				let sessConf = {};
				for (let key in soajs.serviceConf._conf.session) {
					if (Object.hasOwnProperty.call(soajs.serviceConf._conf.session, key)) {
						sessConf[key] = soajs.serviceConf._conf.session[key];
					}
				}
				sessConf.store = store;
				_self.app.use(session(sessConf));
				_self.log.info("Express-Session middleware initialization done.");
			} else {
				_self.log.info("Express-Session middleware initialization skipped.");
			}
			
			if (soajs.param.inputmask && soajs.param.schema) {
				let inputmask_mw = require("./../mw/inputmask/index");
				let inputmaskSrc = ["params", "headers", "query"];
				if (soajs.param.cookieParser) {
					inputmaskSrc.push("cookies");
				}
				if (soajs.param.bodyParser) {
					inputmaskSrc.push("body");
				}
				
				soajs.inputmask = inputmask_mw(soajs.param, inputmaskSrc, core);
				_self.log.info("IMFV middleware initialization done.");
			} else {
				_self.log.info("IMFV middleware initialization skipped.");
			}
			
			let service_mw = require("./../mw/service/index");
			soajs.serviceMW = service_mw({"soajs": soajs, "app": _self.app, "param": soajs.param, "core": core});
			_self.log.info("SOAJS Service middleware initialization done.");
			
			//Expose some core function after init
			_self.getCustomRegistry = function () {
				return registryModule.getCustom();
			};
			
			_self.registry = {
				"get": registryModule.get
			};
			
			callback();
		});
	}
};

/**
 *
 */
Service.prototype.start = function (cb) {
	let _self = this;
	if (_self.app && _self.app.soajs) {
		_self.log.info("Service about to start ...");
		_self.app.all('*', function (req, res, next) {
			req.soajs.log.error(151, 'Unknown API : ' + req.path);
			return next(151);
			//res.jsonp(req.soajs.buildResponse(core.error.getError(151)));
		});
		
		_self.app.use(utils.logErrors);
		_self.app.use(utils.serviceClientErrorHandler);
		_self.app.use(utils.serviceErrorHandler);
		
		_self.log.info("Starting Service ...");
		
		//calculate the data port value
		let finalDataPort = _self.app.soajs.param.servicePort;
		if (!process.env.SOAJS_DEPLOY_HA) {
			if (process.env.SOAJS_SRVPORT) {
				finalDataPort = parseInt(process.env.SOAJS_SRVPORT);
				if (isNaN(finalDataPort)) {
					throw new Error("Invalid port value detected in SOAJS_SRVPORT environment variable, port value is not a number!");
				}
			} else if (process.env.SOAJS_ENV && process.env.SOAJS_ENV.toUpperCase() !== 'DASHBOARD') {
				finalDataPort += _self.app.soajs.serviceConf._conf.ports.controller;
			}
		}
		
		_self.app.httpServer = _self.app.listen(finalDataPort, function (err) {
			if (err) {
				_self.log.error(core.error.generate(141).message);
				_self.log.error(err.message);
			} else if (!process.env.SOAJS_DEPLOY_HA) {
				if (autoRegHost) {
					_self.log.info("Initiating service auto register for awareness ...");
					registryModule.autoRegisterService({
						"name": _self.app.soajs.param.serviceName,
						"description": _self.app.soajs.param.description,
						"type": _self.app.soajs.param.type,
						"subType": _self.app.soajs.param.subType,
						"group": _self.app.soajs.param.serviceGroup,
						"port": _self.app.soajs.param.servicePort,
						"portHost": finalDataPort,
						"ip": _self.app.soajs.param.serviceIp,
						"version": _self.app.soajs.param.serviceVersion,
						
						"oauth": _self.app.soajs.param.oauth,
						"urac": _self.app.soajs.param.urac,
						"urac_Profile": _self.app.soajs.param.urac_Profile,
						"urac_ACL": _self.app.soajs.param.urac_ACL,
						"urac_Config": _self.app.soajs.param.urac_Config,
						"urac_GroupConfig": _self.app.soajs.param.urac_GroupConfig,
						"tenant_Profile": _self.app.soajs.param.tenant_Profile,
						"provision_ACL": _self.app.soajs.param.provision_ACL,
						"extKeyRequired": _self.app.soajs.param.extKeyRequired,
						"requestTimeout": _self.app.soajs.param.requestTimeout,
						"requestTimeoutRenewal": _self.app.soajs.param.requestTimeoutRenewal,
						"interConnect": _self.app.soajs.param.interConnect,
						
						"apiList": _self.app.soajs.apiList,
						"maintenance": _self.app.soajs.param.maintenance,
						
						"mw": _self.app.soajs.param.mw || false,
						"serviceHATask": _self.app.soajs.param.serviceHATask
					}, function (err, registered) {
						if (err) {
							_self.log.warn('Unable to trigger autoRegisterService awareness for controllers: ' + err);
						} else if (registered) {
							_self.log.info('The autoRegisterService @ controllers for [' + _self.app.soajs.param.serviceName + '@' + _self.app.soajs.param.serviceIp + '] successfully finished.');
						}
					});
				} else {
					_self.log.info("Service auto register for awareness, skipped.");
				}
				
				_self.log.info(_self.app.soajs.param.serviceName + " service started on port: " + finalDataPort);
				if (cb && typeof cb === "function") {
					cb(err);
				}
			} else {
				if (cb && typeof cb === "function") {
					cb(err);
				}
			}
		});
		
		//MAINTENANCE Service Routes
		_self.log.info("Adding Service Maintenance Routes ...");
		
		//calculate the maintenance port value
		let maintenancePort = _self.app.soajs.param.servicePort + _self.app.soajs.serviceConf._conf.ports.maintenanceInc;
		if (!process.env.SOAJS_DEPLOY_HA) {
			if (process.env.SOAJS_SRVPORT) {
				let envPort = parseInt(process.env.SOAJS_SRVPORT);
				if (isNaN(envPort)) {
					throw new Error("Invalid port value detected in SOAJS_SRVPORT environment variable, port value is not a number!");
				}
				maintenancePort = envPort + _self.app.soajs.serviceConf._conf.ports.maintenanceInc;
			} else if (process.env.SOAJS_ENV && process.env.SOAJS_ENV.toUpperCase() !== 'DASHBOARD') {
				maintenancePort += _self.app.soajs.serviceConf._conf.ports.controller;
			}
		}
		
		_self.appMaintenance.get("/heartbeat", (req, res) => {
			let response = _self.maintenanceResponse(req);
			response.result = true;
			res.jsonp(response);
		});
		_self.appMaintenance.get("/reloadRegistry", (req, res) => {
			registryModule.reload({
				"type": _self.app.soajs.param.type,
				"name": _self.app.soajs.param.serviceName,
				"group": _self.app.soajs.param.serviceGroup,
				"port": _self.app.soajs.param.servicePort,
				"version": _self.app.soajs.param.serviceVersion,
				"extKeyRequired": _self.app.soajs.param.extKeyRequired,
				"requestTimeout": _self.app.soajs.param.requestTimeout,
				"requestTimeoutRenewal": _self.app.soajs.param.requestTimeoutRenewal
			}, function (err, reg) {
				if (err) {
					_self.log.warn("Failed to load registry. reusing from previous load. Reason: " + err.message);
				}
				let response = _self.maintenanceResponse(req);
				response.result = true;
				response.data = reg;
				res.jsonp(response);
				
			});
		});
		_self.appMaintenance.get("/resourceInfo", (req, res) => {
			let response = _self.maintenanceResponse(req);
			let data = {};
			data.hostname = os.hostname();
			data.uptime = os.uptime();
			data.cpus = os.cpus();
			data.net = os.networkInterfaces();
			data.mem = {'total': os.totalmem(), 'free': os.freemem()};
			data.load = os.loadavg();
			response.result = true;
			response.data = data;
			res.jsonp(response);
		});
		_self.appMaintenance.all('*', (req, res) => {
			let response = _self.maintenanceResponse(req, "heartbeat");
			response.result = true;
			res.jsonp(response);
		});
		_self.appMaintenance.httpServer = _self.appMaintenance.listen(maintenancePort, (err) => {
			if (err) {
				_self.log.error(err.message);
			}
			_self.log.info(_self.app.soajs.param.serviceName + " service maintenance is listening on port: " + maintenancePort);
		});
	} else {
		if (cb && typeof cb === "function") {
			cb(new Error('Failed starting service'));
		} else {
			throw new Error('Failed starting service');
		}
	}
};

Service.prototype.stop = function (cb) {
	let _self = this;
	_self.log.info('stopping service[' + _self.app.soajs.param.serviceName + '] on port:', _self.app.soajs.serviceConf.info.port);
	_self.app.httpServer.close((err) => {
		if (err) {
			_self.log.error(err.message);
		}
		_self.appMaintenance.httpServer.close((err) => {
			if (cb) {
				cb(err);
			}
		});
	});
};

//-------------------------- ROUTES support

function injectInputmask(restApp, args) {
	if (restApp.app.soajs.inputmask) {
		let len = args.length;
		let argsNew = [];
		argsNew.push(args[0]);
		argsNew.push(restApp.app.soajs.inputmask);
		for (let i = 1; i < len; i++) {
			argsNew[i + 1] = args[i];
		}
		return argsNew;
	}
	return args;
}

function injectServiceMW(restApp, args) {
	if (restApp.app.soajs.serviceMW) {
		let len = args.length;
		let argsNew = [];
		argsNew.push(args[0]);
		argsNew.push(restApp.app.soajs.serviceMW);
		for (let i = 1; i < len; i++) {
			argsNew[i + 1] = args[i];
		}
		return argsNew;
	}
	return args;
}

function isSOAJready(app, log) {
	if (app && app.soajs) {
		return true;
	}
	log.info("Can't attach route because soajs express app is not defined");
	return false;
}

function routeInjection(_self, args) {
	args = injectInputmask(_self, args);
	args = injectServiceMW(_self, args);
	return args;
}

Service.prototype.all = function () {
	let _self = this;
	if (!isSOAJready(_self.app, _self.log)) {
		return;
	}
	let args = routeInjection(_self, arguments);
	_self.app.all.apply(_self.app, args);
};
Service.prototype.get = function () {
	let _self = this;
	if (!isSOAJready(_self.app, _self.log)) {
		return;
	}
	let args = routeInjection(_self, arguments);
	_self.app.get.apply(_self.app, args);
};
Service.prototype.post = function () {
	let _self = this;
	if (!isSOAJready(_self.app, _self.log)) {
		return;
	}
	let args = routeInjection(_self, arguments);
	_self.app.post.apply(_self.app, args);
};
Service.prototype.put = function () {
	let _self = this;
	if (!isSOAJready(_self.app, _self.log)) {
		return;
	}
	let args = routeInjection(_self, arguments);
	_self.app.put.apply(_self.app, args);
};
Service.prototype.delete = function () {
	let _self = this;
	if (!isSOAJready(_self.app, _self.log)) {
		return;
	}
	let args = routeInjection(_self, arguments);
	_self.app.delete.apply(_self.app, args);
};

module.exports = Service;