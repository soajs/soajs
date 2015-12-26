'use strict';

var path = require('path');

var provision = require("./../modules/soajs.provision/index.js");
var core = require("./../modules/soajs.core/index.js");

var lib = require("./../lib/index");

var express = require("./../classes/express");

var autoRegHost = process.env.SOAJS_SRV_AUTOREGISTERHOST || true;
if(autoRegHost && typeof(autoRegHost) !== 'boolean'){
	autoRegHost = (autoRegHost === 'true');
}

/*
 * param = {
 *           logger : boolean
 *           bodyParser : boolean
 *           methodOverride : boolean
 *           cookieParser : boolean
 *           inputmask : boolean
 *
 *           session : boolean
 *           security : boolean
 *           multitenant: boolean
 *           acl: boolean
 *
 *           config : object
 *         }
 */
/**
 *
 * @param param
 */
function service(param) {
	var _self = this;
	var defaultParam = ["bodyParser", "methodOverride", "cookieParser", "logger", "inputmask"];
	var len = defaultParam.length;
	for(var i = 0; i < len; i++) {
		if(!Object.hasOwnProperty.call(param, defaultParam[i])) {
			param[defaultParam[i]] = true;
		}
	}
	var soajs = {};
	soajs.param = param;

	_self.app = express();
	_self.appMaintenance = express();

	_self.app.soajs = soajs;
}

function extractAPIsList(schema) {
	var excluded = ['commonFields'];
	var apiList = [];
	for(var route in schema) {
		if(Object.hasOwnProperty.call(schema, route)) {
			if(excluded.indexOf(route) !== -1) {
				continue;
			}

			var oneApi = {
				'l': schema[route]._apiInfo.l,
				'v': route
			};

			if(schema[route]._apiInfo.group) {
				oneApi.group = schema[route]._apiInfo.group;
			}

			if(schema[route]._apiInfo.groupMain) {
				oneApi.groupMain = schema[route]._apiInfo.groupMain;
			}

			apiList.push(oneApi);
		}
	}
	return apiList;
}

service.prototype.init = function(callback) {
	var _self = this;
	var registry = null;
	var soajs = _self.app.soajs;
	//var param = soajs.param;

	soajs.param.config.serviceName = soajs.param.serviceName || soajs.param.config.serviceName;
	soajs.param.config.serviceVersion = soajs.param.config.serviceVersion || 1;
	soajs.param.config.servicePort = soajs.param.config.servicePort || null;
	soajs.param.config.extKeyRequired = soajs.param.config.extKeyRequired || false;
	soajs.param.config.requestTimeout = soajs.param.config.requestTimeout || null;
	soajs.param.config.requestTimeoutRenewal = soajs.param.config.requestTimeoutRenewal || null;
	soajs.param.config.awareness = soajs.param.config.awareness || false;
	soajs.param.config.serviceIp = process.env.SOAJS_SRVIP || null;

	//NOTE: to support backward compatibility where serviceName can be at the root of param
	//soajs.serviceName = param.serviceName || param.config.serviceName;
	//param.config.serviceName = soajs.serviceName;
	//END NOTE
    //soajs.serviceVersion = param.config.serviceVersion || 1;
	//soajs.awareness = param.config.awareness || false;
	//soajs.serviceIp = process.env.SOAJS_SRVIP || null;
	//soajs.designatedPort = param.config.servicePort || null;
	//soajs.extKeyRequired = param.config.extKeyRequired || false;
	//soajs.requestTimeout = param.config.requestTimeout || null;
	//soajs.requestTimeoutRenewal = param.config.requestTimeoutRenewal || null;

	var fetchedHostIp = null;
	var serviceIpNotDetected = false;
	if(!autoRegHost){
		soajs.param.config.serviceIp = '127.0.0.1';
	}
	if(!soajs.param.config.serviceIp) {
		fetchedHostIp = core.getHostIp();
      if(fetchedHostIp && fetchedHostIp.result) {
		  soajs.param.config.serviceIp = fetchedHostIp.ip;
      } else {
          serviceIpNotDetected = true;
		  soajs.param.config.serviceIp = "127.0.0.1";
      }
	}

	soajs.apiList = extractAPIsList(soajs.param.config.schema);

	core.registry.load({
		"serviceName": soajs.param.config.serviceName,
        "serviceVersion": soajs.param.config.serviceVersion,
		"designatedPort": soajs.param.config.servicePort,
		"extKeyRequired": soajs.param.config.extKeyRequired,
		"requestTimeout": soajs.param.config.requestTimeout,
		"requestTimeoutRenewal": soajs.param.config.requestTimeoutRenewal,
		"awareness": soajs.param.config.awareness,
		"serviceIp": soajs.param.config.serviceIp,
		"apiList": soajs.apiList
	}, function(reg) {
		registry = reg;
		soajs.serviceConf = lib.registry.getServiceConf(soajs.param.config.serviceName, registry);
		soajs.provision = registry.coreDB.provision;

		_self._log = core.getLogger(soajs.param.config.serviceName, registry.serviceConfig.logger);
		_self._log.info("Registry has been loaded successfully from environment: " + registry.environment);

		if(fetchedHostIp) {
			if(!fetchedHostIp.result) {
				_self._log.warn("Unable to find the service host ip. The service will NOT be registered for awareness.");
				_self._log.info("IPs found: ", fetchedHostIp.ips);
				if(serviceIpNotDetected) {
					_self._log.warn("The default service IP has been used [" + soajs.param.config.serviceIp + "]");
				}
			}
			else {
				_self._log.info("The IP registered for service [" + soajs.param.config.serviceName + "] awareness : ", fetchedHostIp.ip);
			}
		}

		if(!soajs.param.config.serviceName || !soajs.serviceConf) {
			if(!soajs.param.config.serviceName) {
				_self._log.error('Service failed to start, serviceName is empty [' + soajs.param.config.serviceName + ']');
			} else {
				_self._log.error('Service [' + soajs.param.config.serviceName + '] failed to start. Unable to find the service entry in registry');
			}
			return callback(new Error("Service shutdown due to failure!"));
		}

		_self._log.info("Service middleware initialization started...");

		var favicon_mw = require("./../mw/favicon/index");
		_self.app.use(favicon_mw());
		_self.appMaintenance.use(favicon_mw());
		_self._log.info("Favicon middleware initialization done.");

		if(soajs.param.logger) {
			var logger = require('morgan');
			_self.app.use(logger('combined'));
			_self._log.info("Morgan Logger middleware initialization done.");
		}
		else{
			_self._log.info("Morgan Logger middleware initialization skipped.");
		}

		var soajs_mw = require("./../mw/soajs/index");
		_self.app.use(soajs_mw({"log": _self._log}));

		var response_mw = require("./../mw/response/index");
		_self.app.use(response_mw({}));

		if(soajs.param.bodyParser) {
			var bodyParser = require('body-parser');
			_self.app.use(bodyParser.json());
			_self.app.use(bodyParser.urlencoded({extended: true}));
			_self._log.info("Body-Parse middleware initialization done.");
		}
		else{
			_self._log.info("Body-Parser middleware initialization skipped.");
		}

		if(soajs.param.methodOverride) {
			var methodOverride = require('method-override');
			_self.app.use(methodOverride());
			_self._log.info("Method-Override middleware initialization done.");
		}
		else{
			_self._log.info("Method-Override middleware initialization skipped.");
		}

		if(soajs.param.cookieParser) {
			var cookieParser = require('cookie-parser');
			_self.app.use(cookieParser(soajs.serviceConf._conf.cookie.secret));
			_self._log.info("CookieParser middleware initialization done.");
		}
		else{
			_self._log.info("CookieParser middleware initialization skipped.");
		}

		if(soajs.param.session) {
			var session = require('express-session');
			var MongoStore = require('./../modules/soajs.mongoStore/index.js')(session);
			var store = new MongoStore(registry.coreDB.session);
			var sessConf = {};
			for(var key in soajs.serviceConf._conf.session) {
				if(Object.hasOwnProperty.call(soajs.serviceConf._conf.session, key)) {
					sessConf[key] = soajs.serviceConf._conf.session[key];
				}
			}
			sessConf.store = store;
			_self.app.use(session(sessConf));
			_self._log.info("Express-Session middleware initialization done.");
		}
		else{
			_self._log.info("Express-Session middleware initialization skipped.");
		}

		if(soajs.param.inputmask && soajs.param.config.schema) {
			var inputmask_mw = require("./../mw/inputmask/index");
			var inputmaskSrc = ["params", "headers", "query"];
			if(soajs.param.cookieParser) {
				inputmaskSrc.push("cookies");
			}
			if(soajs.param.bodyParser) {
				inputmaskSrc.push("body");
			}

			soajs.inputmask = inputmask_mw(soajs.param.config, inputmaskSrc);
			_self._log.info("IMFV middleware initialization done.");
		}
		else{
			_self._log.info("IMFV middleware initialization skipped.");
		}

		if(soajs.param.bodyParser && soajs.param.oauth) {
			var oauthserver = require('oauth2-server');
			_self.oauth = oauthserver({
				model: provision.oauthModel,
				grants: registry.serviceConfig.oauth.grants,
				debug: registry.serviceConfig.oauth.debug
			});

			soajs.oauthService = soajs.param.oauthService || {"name": "oauth", "tokenApi": "/token"};
			if(!soajs.oauthService.name) {
				soajs.oauthService.name = "oauth";
			}
			if(!soajs.oauthService.tokenApi) {
				soajs.oauthService.tokenApi = "/token";
			}

			soajs.oauth = _self.oauth.authorise();
			_self._log.info("oAuth middleware initialization done.");
		}
		else{
			_self._log.info("oAuth middleware initialization skipped.");
		}

		if(soajs.param.config.awareness) {
			var awareness_mw = require("./../mw/awareness/index");
			_self.app.use(awareness_mw({
				"serviceName": soajs.param.config.serviceName,
				"serviceVersion": soajs.param.config.serviceVersion,
				"designatedPort": soajs.param.config.servicePort,
				"extKeyRequired": soajs.param.config.extKeyRequired,
				"requestTimeout": soajs.param.config.requestTimeout,
				"requestTimeoutRenewal": soajs.param.config.requestTimeoutRenewal,
				"awareness": soajs.param.config.awareness,
				"serviceIp": soajs.param.config.serviceIp,
				"apiList": soajs.apiList,
				"log": _self._log
			}));
			_self._log.info("Awareness middleware initialization done.");
		}
		else{
			_self._log.info("Awareness middleware initialization skipped.");
		}

		var service_mw = require("./../mw/service/index");
		_self.app.use(service_mw({"soajs": soajs, "app": _self.app, "param": soajs.param}));
		_self._log.info("SOAJS Service middleware initialization done.");

        if (soajs.param.roaming) {
            var roaming_mw = require("./../mw/roaming/index");
            _self.app.use(roaming_mw({"app": _self.app}));
            _self._log.info("SOAJS Roaming middleware initialization done.");
        }
		callback();
	});
};

/**
 *
 */
service.prototype.start = function(cb) {
	var _self = this;
	if(_self.app && _self.app.soajs) {
		_self._log.info("Service about to start ...");

		_self.app.all('*', function(req, res) {
			req.soajs.log.error(151, 'Unknown API : ' + req.path);
			res.jsonp(req.soajs.buildResponse(core.error.getError(151)));
		});

		_self.app.use(logErrors);
		_self.app.use(clientErrorHandler);
		_self.app.use(errorHandler);

		_self._log.info("Loading Service Provision ...");
		provision.init(_self.app.soajs.provision, _self._log);
		provision.loadProvision(function(loaded) {
			if(loaded) {
				_self._log.info("Service provision loaded.");
				_self._log.info("Starting Service ...");
				_self.app.httpServer = _self.app.listen(_self.app.soajs.serviceConf.info.port, function(err) {
					_self._log.info(_self.app.soajs.param.config.serviceName + " service started on port: " + _self.app.soajs.serviceConf.info.port);
					if(autoRegHost){
						_self._log.info("Initiating service auto register for awareness ...");
						core.registry.autoRegisterService(_self.app.soajs.param.config.serviceName, _self.app.soajs.param.config.serviceIp, _self.app.soajs.param.config.serviceVersion, "services", function(err, registered) {
						  if(err) {
							  _self._log.warn('Unable to trigger autoRegisterService awareness for controllers: ' + err);
						  } else if(registered) {
							  _self._log.info('The autoRegisterService @ controllers for [' + _self.app.soajs.param.config.serviceName + '@' + _self.app.soajs.param.config.serviceIp + '] successfully finished.');
						  }
						});
					}
					else{
						_self._log.info("Service auto register for awareness, skipped.");
					}
					if(cb) {
						cb(err);
					}
				});

				//MAINTENANCE Service Routes
				_self._log.info("Adding Service Maintenance Routes ...");
				var maintenancePort = _self.app.soajs.serviceConf.info.port + _self.app.soajs.serviceConf._conf.ports.maintenanceInc;
				var maintenanceResponse = function(req, route) {
					var response = {
						'result': false,
						'ts': Date.now(),
						'service': {
							'service': _self.app.soajs.param.config.serviceName.toUpperCase(),
							'type': 'rest',
							'route': route || req.path
						}
					};
					return response;
				};
				_self.appMaintenance.get("/heartbeat", function(req, res) {
					var response = maintenanceResponse(req);
					response['result'] = true;
					res.jsonp(response);
				});

				_self.appMaintenance.get("/reloadRegistry", function(req, res) {
					core.registry.reload({
						"serviceName": _self.app.soajs.param.config.serviceName,
						"serviceVersion": _self.app.soajs.param.config.serviceVersion,
						"designatedPort": _self.app.soajs.param.config.servicePort,
						"extKeyRequired": _self.app.soajs.param.config.extKeyRequired,
						"requestTimeout": _self.app.soajs.param.config.requestTimeout,
						"requestTimeoutRenewal": _self.app.soajs.param.config.requestTimeoutRenewal,
						"awareness": _self.app.soajs.param.config.awareness,
						"serviceIp": _self.app.soajs.param.config.serviceIp
					}, function(err, reg) {
              if(err) {
                  _self._log.warn("Failed to load registry. reusing from previous load. Reason: " + err.message);
              }
						var response = maintenanceResponse(req);
						response['result'] = true;
						response['data'] = reg;
						res.jsonp(response);

					});
				});
				_self.appMaintenance.get("/loadProvision", function(req, res) {
					provision.loadProvision(function(loaded) {
						var response = maintenanceResponse(req);
						response['result'] = loaded;
						res.jsonp(response);
					});
				});
				_self.appMaintenance.all('*', function(req, res) {
					var response = maintenanceResponse(req, "heartbeat");
					response['result'] = true;
					res.jsonp(response);
				});
				_self.appMaintenance.httpServer = _self.appMaintenance.listen(maintenancePort, function(err) {
					_self._log.info(_self.app.soajs.param.config.serviceName + " service maintenance is listening on port: " + maintenancePort);
				});
			}
		});
	} else {
		if(cb && typeof cb === "function") {
			cb(new Error('Failed starting service'));
		} else {
			throw new Error('Failed starting service');
		}
	}
};

service.prototype.stop = function(cb) {
	var _self = this;
	_self._log.info('stopping service[' + _self.app.soajs.param.config.serviceName + '] on port:', _self.app.soajs.serviceConf.info.port);
	_self.app.httpServer.close(function(err) {
		_self.appMaintenance.httpServer.close(function(err) {
			if(cb) {
				cb(err);
			}
		});
	});
};

//-------------------------- ROUTES support
/**
 *
 * @param restApp
 * @param args
 * @returns {*}
 */
function injectOauth(restApp, args) {
	if(restApp.app.soajs.oauthService && restApp.app.soajs.param.config.serviceName === restApp.app.soajs.oauthService.name && args[0] === restApp.app.soajs.oauthService.tokenApi) {
		return args;
	}

	var oauthModelInjection = function(req, res, next) {
		if(req.soajs) {
			provision.getOauthToken(req.query.access_token, function(err, record) {
				restApp.oauth.model["getAccessToken"] = function(bearerToken, callback) {
					if(record && record.oauthAccessToken) {
						if(record.oauthAccessToken.accessToken === bearerToken) {
							return callback(false, record.oauthAccessToken);
						}
					}
					return callback(false, false);
				};
				restApp.oauth.model["getRefreshToken"] = function(bearerToken, callback) {
					if(record && record.oauthRefreshToken) {
						if(record.oauthRefreshToken.refreshToken === bearerToken) {
							return callback(false, record.oauthRefreshToken);
						}
					}
					return callback(false, false);
				};
				return next();
			});
		}
		else {
			return next();
		}
	};

	if(restApp.app.soajs.oauth) {
		var len = args.length;
		var argsNew = [];
		argsNew.push(args[0]);
		argsNew.push(oauthModelInjection);
		argsNew.push(restApp.app.soajs.oauth);
		for(var i = 1; i < len; i++) {
			argsNew[i + 2] = args[i];
		}

		return argsNew;
	}
	return args;
}
/**
 *
 * @param restApp
 * @param args
 * @returns {*}
 */
function injectInputmask(restApp, args) {
	if(restApp.app.soajs.inputmask) {
		var len = args.length;
		var argsNew = [];
		argsNew.push(args[0]);
		argsNew.push(restApp.app.soajs.inputmask);
		for(var i = 1; i < len; i++) {
			argsNew[i + 1] = args[i];
		}
		return argsNew;
	}
	return args;
}
/**
 *
 * @param app
 * @returns {boolean}
 */
function isSOAJready(app, _log) {
	if(app && app.soajs) {
		return true;
	}
	_log.info("Can't attach route because soajs express app is not defined");
	return false;
}
/**
 *
 */
service.prototype.all = function() {
	var _self = this;
	if(!isSOAJready(_self.app, _self._log)) return;
	var args = injectOauth(_self, arguments);
	args = injectInputmask(_self, args);
	_self.app.all.apply(_self.app, args);
};
/**
 *
 */
service.prototype.get = function() {
	var _self = this;
	if(!isSOAJready(_self.app, _self._log)) return;
	var args = injectOauth(_self, arguments);
	args = injectInputmask(_self, args);
	_self.app.get.apply(_self.app, args);
};
/**
 *
 */
service.prototype.post = function() {
	var _self = this;
	if(!isSOAJready(_self.app, _self._log)) return;
	var args = injectOauth(_self, arguments);
	args = injectInputmask(_self, args);
	_self.app.post.apply(_self.app, args);
};

/**
 *
 */
service.prototype.put = function() {
	var _self = this;
	if(!isSOAJready(_self.app, _self._log)) return;
	var args = injectOauth(_self, arguments);
	args = injectInputmask(_self, args);
	_self.app.put.apply(_self.app, args);
};
/**
 *
 */
service.prototype.delete = function() {
	var _self = this;
	if(!isSOAJready(_self.app, _self._log)) return;
	var args = injectOauth(_self, arguments);
	args = injectInputmask(_self, args);
	_self.app.delete.apply(_self.app, args);
};


//-------------------------- ERROR Handling MW
/**
 *
 * @param err
 * @param req
 * @param res
 * @param next
 */
function logErrors(err, req, res, next) {
	if(typeof err === "number") {
		req.soajs.log.error(core.error.generate(err));
		return next(err);
	}
	if(typeof err === "object") {
		if(err.code && err.message) {
			req.soajs.log.error(err);
			return next({"code": err.code, "msg": err.message});
		}
		else {
			req.soajs.log.error(err);
			req.soajs.log.error(core.error.generate(164));
		}
	}
	else {
		req.soajs.log.error(err);
		req.soajs.log.error(core.error.generate(164));
	}

	return next(core.error.getError(164));
}
/**
 *
 * @param err
 * @param req
 * @param res
 * @param next
 */
function clientErrorHandler(err, req, res, next) {
	if(req.xhr) {
		req.soajs.log.error(core.error.generate(150));
		res.status(500).send(req.soajs.buildResponse(core.error.getError(150)));
	} else {
		return next(err);
	}
}
/**
 *
 * @param err
 * @param req
 * @param res
 * @param next
 */
function errorHandler(err, req, res, next) {
	res.status(500);
	if(err.code && err.msg) {
		res.jsonp(req.soajs.buildResponse(err));
	} else {
		res.jsonp(req.soajs.buildResponse(core.error.getError(err)));
	}
}

module.exports = service;