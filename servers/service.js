'use strict';

var path = require('path');

var provision = require("./../modules/soajs.provision/index.js");
var core = require("./../modules/soajs.core/index.js");

var lib = require("./../lib/index");

var express = require("./../classes/express");

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
		if(!param.hasOwnProperty(defaultParam[i])) {
			param[defaultParam[i]] = true;
		}
	}
	var soajs = {};
	soajs.param = param;

	_self.app = express();
	_self.appMaintenance = express();

	_self.app.soajs = soajs;
}

function extractAPIsList(schema){
	var excluded = ['commonFields'];
	var apiList =[];
	for(var route in schema){
		if(schema.hasOwnProperty(route)){
			if(excluded.indexOf(route) !== -1){
				continue;
			}

			var oneApi = {
				'l': schema[route]._apiInfo.l,
				'v': route
			};

			if(schema[route]._apiInfo.group){
				oneApi.group = schema[route]._apiInfo.group;
			}

			if(schema[route]._apiInfo.groupMain){
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
	var param = soajs.param;
    soajs.serviceName = param.serviceName || param.config.serviceName;
    soajs.awareness = param.config.awareness || false;
    soajs.serviceIp = process.env.SOAJS_SRVIP || null;

	var fetchedHostIp = null;
    var serviceIpNotDetected = false;
    if (!soajs.serviceIp) {
         fetchedHostIp = core.getHostIp();
        if (fetchedHostIp && fetchedHostIp.result)
            soajs.serviceIp = fetchedHostIp.ip;
        else {
            serviceIpNotDetected = true;
            soajs.serviceIp = "127.0.0.1";
        }
    }

	_self.app.soajs.apiList = extractAPIsList(param.config.schema);
	core.loadRegistry({
		"serviceName": soajs.serviceName,
		"designatedPort": param.config.servicePort || null,
		"extKeyRequired": param.config.extKeyRequired || false,
		"apiList": _self.app.soajs.apiList,
		"awareness": soajs.awareness,
		"serviceIp": soajs.serviceIp
	}, function(reg) {
		registry = reg;
		soajs.serviceConf = lib.registry.getServiceConf(soajs.serviceName, registry);
		soajs.provision = registry.coreDB.provision;

		_self._log = core.getLogger(soajs.serviceName, registry.serviceConfig.logger);

        if (fetchedHostIp){
            if (!fetchedHostIp.result) {
                _self._log.warn("Unable to find the service host ip. The service will NOT be registered for awareness.");
                _self._log.info("IPs found: ", fetchedHostIp.ips);
                if (serviceIpNotDetected)
                    _self.log.warn("The default service IP has been used ["+soajs.serviceIp+"]");
            }
            else
                _self._log.info("The IP registered for service ["+soajs.serviceName+"] awareness : ", fetchedHostIp.ip);
        }

		if(!soajs.serviceName || !soajs.serviceConf) {
			if(!soajs.serviceName) {
				_self._log.error('Service failed to start, serviceName is empty [' + soajs.serviceName + ']');
			} else {
				_self._log.error('Service [' + soajs.serviceName + '] failed to start. Unable to find the service entry in registry');
			}
			return callback(new Error ("Service shutdown due to failure!"));
		}

        var favicon_mw = require("./../mw/favicon/index");
        _self.app.use(favicon_mw());

        if(param.logger) {
            var logger = require('morgan');
            _self.app.use(logger('combined'));
        }

        var soajs_mw = require("./../mw/soajs/index");
        _self.app.use(soajs_mw({"log": _self._log}));
        _self.appMaintenance.use(soajs_mw({"log": _self._log}));

        //var cors_mw = require("./../mw/cors/index");
        //_self.appMaintenance.use(cors_mw());

        var response_mw = require("./../mw/response/index");
        _self.app.use(response_mw({}));
        _self.appMaintenance.use(response_mw({}));

        if(param.bodyParser) {
            var bodyParser = require('body-parser');
            _self.app.use(bodyParser.json());
            _self.app.use(bodyParser.urlencoded({extended: true}));
        }

        if(param.methodOverride) {
            var methodOverride = require('method-override');
            _self.app.use(methodOverride());
        }

        if(param.cookieParser) {
            var cookieParser = require('cookie-parser');
            _self.app.use(cookieParser(soajs.serviceConf._conf.cookie.secret));
        }

        if(param.session) {
            var session = require('express-session');
            var MongoStore = require('./../modules/soajs.mongoStore/index.js')(session);
            var store = new MongoStore(registry.coreDB.session);
            var sessConf = {};
            for(var key in soajs.serviceConf._conf.session) {
                if(soajs.serviceConf._conf.session.hasOwnProperty(key)) {
                    sessConf[key] = soajs.serviceConf._conf.session[key];
                }
            }
            sessConf.store = store;
            _self.app.use(session(sessConf));
        }

        if(param.inputmask && param.config.schema) {
            var inputmask_mw = require("./../mw/inputmask/index");
            var inputmaskSrc = ["params", "headers", "query"];
            if(param.cookieParser) {
                inputmaskSrc.push("cookies");
            }
            if(param.bodyParser) {
                inputmaskSrc.push("body");
            }

            soajs.inputmask = inputmask_mw(param.config, inputmaskSrc);
        }

		if(param.bodyParser && param.oauth) {
			var oauthserver = require('oauth2-server');
			_self.oauth = oauthserver({
				model: provision.oauthModel,
				grants: registry.serviceConfig.oauth.grants,
				debug: registry.serviceConfig.oauth.debug
			});

			soajs.oauthService = param.oauthService || {"name": "oauth", "tokenApi": "/token"};
			if(!soajs.oauthService.name) {
				soajs.oauthService.name = "oauth";
			}
			if(!soajs.oauthService.tokenApi) {
				soajs.oauthService.tokenApi = "/token";
			}

			soajs.oauth = _self.oauth.authorise();
		}
		if(soajs.awareness) {
			var awareness_mw = require("./../mw/service/index");
			_self.app.use(awareness_mw({
				"awareness": soajs.awareness,
				"serviceName": soajs.serviceName,
				"log": _self.log,
				"apiList": _self.app.soajs.apiList,
				"serviceIp": _self.app.soajs.serviceIp
			}));
		}
		var service_mw = require("./../mw/service/index");
		_self.app.use(service_mw({"soajs": soajs, "app": _self.app, "param": param}));

		callback();
	});
};

/**
 *
 */
service.prototype.start = function(cb) {
	var _self = this;
	if(_self.app && _self.app.soajs) {

		_self.app.all('*', function(req, res) {
			req.soajs.log.error(151, 'Unknown API : ' + req.path);
			res.jsonp(req.soajs.buildResponse(core.error.getError(151)));
		});

		_self.app.use(logErrors);
		_self.app.use(clientErrorHandler);
		_self.app.use(errorHandler);

			provision.init(_self.app.soajs.provision, _self._log);
			provision.loadProvision(function(loaded) {
				if(loaded) {
					_self.app.httpServer = _self.app.listen(_self.app.soajs.serviceConf.info.port, function(err) {
						_self._log.info(_self.app.soajs.serviceName + " service started on port: " + _self.app.soajs.serviceConf.info.port);
						// Awareness
						if(_self.app.soajs.awareness) {

						}
						if(cb) {
							cb(err);
						}
					});

					//MAINTENANCE Service Routes
					var maintenancePort = _self.app.soajs.serviceConf.info.port + _self.app.soajs.serviceConf._conf.ports.maintenanceInc;
					var maintenanceResponse = function(req, route) {
						var response = {
							'result': false,
							'ts': Date.now(),
							'service': {
								'service': _self.app.soajs.serviceName,
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
						core.reloadRegistry({
							"serviceName": _self.app.soajs.serviceName,
							"apiList": _self.app.soajs.apiList,
							"awareness": _self.app.soajs.awareness,
							"serviceIp": _self.app.soajs.serviceIp
						}, function(err, reg) {
                            if (err)
                                _self._log.warn("Failed to load registry. reusing from previous load. Reason: " + err.message);
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
					_self.appMaintenance.get("/generateExtKey/:iKey", function(req, res) {
						var key = req.params.iKey;//"d1eaaf5fdc35c11119330a8a0273fee9";
						provision.generateExtKey(key, req.soajs.registry.serviceConfig.key, function(err, data) {
							var response = maintenanceResponse(req);
							if(!err) {
								response['result'] = true;
								response['data'] = data;
							}
							res.jsonp(response);
						});
					});
					_self.appMaintenance.get("/getTenantKeys/:tId", function(req, res) {
						var tId = req.params.tId;//"10d2cb5fc04ce51e06000001";
						provision.getTenantKeys(tId, function(err, data) {
							var response = maintenanceResponse(req);
							if(!err) {
								response['result'] = true;
								response['data'] = data;
							}
							res.jsonp(response);
						});
					});
					_self.appMaintenance.all('*', function(req, res) {
						var response = maintenanceResponse(req, "heartbeat");
						response['result'] = true;
						res.jsonp(response);
					});
					_self.appMaintenance.httpServer = _self.appMaintenance.listen(maintenancePort, function(err) {
						_self._log.info(_self.app.soajs.serviceName + " service maintenance is listening on port: " + maintenancePort);
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
	_self._log.info('stopping service[' + _self.app.soajs.serviceName + '] on port:', _self.app.soajs.serviceConf.info.port);
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
	if(restApp.app.soajs.oauthService && restApp.app.soajs.serviceName === restApp.app.soajs.oauthService.name && args[0] === restApp.app.soajs.oauthService.tokenApi) {
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