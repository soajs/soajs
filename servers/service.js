'use strict';

var path = require('path');
var os = require('os');

var provision = require("./../modules/soajs.provision/index.js");
var core = require("./../modules/soajs.core/index.js");

var lib = require("./../lib/index");

var express = require("./../classes/express");

var autoRegHost = process.env.SOAJS_SRV_AUTOREGISTERHOST || true;
if (autoRegHost && typeof(autoRegHost) !== 'boolean') {
    autoRegHost = (autoRegHost === 'true');
}

/**
 *
 * @param param {}
 */
function service(param) {
    var _self = this;

    //NOTE: added this to trigger a warning if someone is still using old style configuration
    if (!param)
        param = {"oldStyleConfiguration": false};
    if (param && param.config && param.config.serviceName) {
        param.oldStyleConfiguration = true;
        for (var configParam in param.config) {
            if (Object.hasOwnProperty.call(param.config, configParam)) {
                param[configParam] = param.config[configParam];
            }
        }
        delete param.config;
    }
    if (process.env.SOAJS_SOLO && process.env.SOAJS_SOLO === "true") {
        param.extKeyRequired = false;
        param.roaming = false;
        param.session = false;
        param.oauth = false;
        param.awareness = false;
        param.awarenessEnv = false;
    }
    if (param.extKeyRequired === true) {
        param.multitenant = true;
        param.security = true;
        param.acl = true;
    }
    else {
        param.multitenant = false;
        param.security = false;
        param.acl = false;
    }

    var defaultParam = ["bodyParser", "methodOverride", "cookieParser", "logger", "inputmask", "awareness"];
    var len = defaultParam.length;
    for (var i = 0; i < len; i++) {
        if (!Object.hasOwnProperty.call(param, defaultParam[i])) {
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
    var METHOD = ['get', 'post', 'put', 'delete'];
    var apiList = [];

    var processRoute = function (routeObj, routeName, method) {
        var oneApi = {
            'l': routeObj._apiInfo.l,
            'v': routeName,
            'm': method
        };

        if (routeObj._apiInfo.group) {
            oneApi.group = routeObj._apiInfo.group;
        }

        if (routeObj._apiInfo.groupMain) {
            oneApi.groupMain = routeObj._apiInfo.groupMain;
        }
        return (oneApi);
    };
    var processRoutes = function (routes, method) {
        for (var route in routes) {
            if (Object.hasOwnProperty.call(routes, route)) {
                if (excluded.indexOf(route) !== -1) {
                    continue;
                }

                if (METHOD.indexOf(route) !== -1) {
                    processRoutes(routes[route], route);
                }
                else {
                    var oneApi = processRoute(routes[route], route, method);
                    apiList.push(oneApi);
                }
            }
        }
    };
    processRoutes(schema, "");
    return apiList;
}

service.prototype.init = function (callback) {
    var _self = this;
    var registry = null;
    var soajs = _self.app.soajs;
    soajs.param.serviceGroup = soajs.param.serviceGroup || "No Group Service";
    soajs.param.serviceVersion = soajs.param.serviceVersion || 1;
    soajs.param.serviceVersion = parseInt(soajs.param.serviceVersion);
    if (isNaN(soajs.param.serviceVersion)) {
        throw new Error('Service version must be integer: [' + soajs.param.serviceVersion + ']');
    }
    soajs.param.servicePort = soajs.param.servicePort || null;
    soajs.param.extKeyRequired = soajs.param.extKeyRequired || false;
    soajs.param.requestTimeout = soajs.param.requestTimeout || null;
    soajs.param.requestTimeoutRenewal = soajs.param.requestTimeoutRenewal || null;
    soajs.param.awarenessEnv = soajs.param.awarenessEnv || false;
    soajs.param.serviceIp = process.env.SOAJS_SRVIP || null;
    soajs.param.serviceHATask = null;

    var fetchedHostIp = null;
    var serviceIpNotDetected = false;
    if (!autoRegHost) {
        soajs.param.serviceIp = '127.0.0.1';
    }
    if (!soajs.param.serviceIp) {
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
    }
    else {
        resume();
    }

    function resume () {
        soajs.apiList = extractAPIsList(soajs.param.schema);

        core.registry.load({
            "serviceName": soajs.param.serviceName,
            "serviceGroup": soajs.param.serviceGroup,
            "serviceVersion": soajs.param.serviceVersion,
            "designatedPort": soajs.param.servicePort,
            "extKeyRequired": soajs.param.extKeyRequired,
            "requestTimeout": soajs.param.requestTimeout,
            "requestTimeoutRenewal": soajs.param.requestTimeoutRenewal,
            "awareness": soajs.param.awareness,
            "serviceIp": soajs.param.serviceIp,
            "apiList": soajs.apiList
        }, function (reg) {
            registry = reg;
            soajs.serviceConf = lib.registry.getServiceConf(soajs.param.serviceName, registry);

            _self.log = core.getLogger(soajs.param.serviceName, registry.serviceConfig.logger);

            if (process.env.SOAJS_SOLO && process.env.SOAJS_SOLO === "true")
                _self.log.info("SOAJS is in SOLO mode, the following got turned OFF [extKeyRequired, roaming, session, oauth, awareness, awarenessEnv, roaming].");

            if (soajs.param.oldStyleConfiguration)
                _self.log.warn("Old style configuration detected. Please start using the new way of passing param when creating a new service.");
            _self.log.info("Registry has been loaded successfully from environment: " + registry.environment);

            if (fetchedHostIp) {
                if (!fetchedHostIp.result) {
                    _self.log.warn("Unable to find the service host ip. The service will NOT be registered for awareness.");
                    _self.log.info("IPs found: ", fetchedHostIp.extra.ips);
                    if (serviceIpNotDetected) {
                        _self.log.warn("The default service IP has been used [" + soajs.param.serviceIp + "]");
                    }
                }
                else {
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

            var favicon_mw = require("./../mw/favicon/index");
            _self.app.use(favicon_mw());
            _self.appMaintenance.use(favicon_mw());
            _self.log.info("Favicon middleware initialization done.");

            if (soajs.param.logger) {
                var logger = require('morgan');
                _self.app.use(logger('combined'));
                _self.log.info("Morgan Logger middleware initialization done.");
            }
            else {
                _self.log.info("Morgan Logger middleware initialization skipped.");
            }

            var soajs_mw = require("./../mw/soajs/index");
            _self.app.use(soajs_mw({"log": _self.log}));

            var response_mw = require("./../mw/response/index");
            _self.app.use(response_mw({}));

            if (soajs.param.bodyParser) {
                var bodyParser = require('body-parser');
                var options = (soajs.param.bodyParser.limit) ? {limit: soajs.param.bodyParser.limit} : null;
                _self.app.use(bodyParser.json(options));
                _self.app.use(bodyParser.urlencoded({extended: true}));
                _self.log.info("Body-Parse middleware initialization done.");
            }
            else {
                _self.log.info("Body-Parser middleware initialization skipped.");
            }

            if (soajs.param.methodOverride) {
                var methodOverride = require('method-override');
                _self.app.use(methodOverride());
                _self.log.info("Method-Override middleware initialization done.");
            }
            else {
                _self.log.info("Method-Override middleware initialization skipped.");
            }

            if (soajs.param.cookieParser) {
                var cookieParser = require('cookie-parser');
                _self.app.use(cookieParser(soajs.serviceConf._conf.cookie.secret));
                _self.log.info("CookieParser middleware initialization done.");
            }
            else {
                _self.log.info("CookieParser middleware initialization skipped.");
            }

            if (soajs.param.session) {
                var session = require('express-session');
                var MongoStore = require('./../modules/soajs.mongoStore/index.js')(session);
                var store = new MongoStore(registry.coreDB.session);
                _self.log.info(registry.coreDB.session);
                var sessConf = {};
                for (var key in soajs.serviceConf._conf.session) {
                    if (Object.hasOwnProperty.call(soajs.serviceConf._conf.session, key)) {
                        sessConf[key] = soajs.serviceConf._conf.session[key];
                    }
                }
                sessConf.store = store;
                _self.app.use(session(sessConf));
                _self.log.info("Express-Session middleware initialization done.");
            }
            else {
                _self.log.info("Express-Session middleware initialization skipped.");
            }

            if (soajs.param.inputmask && soajs.param.schema) {
                var inputmask_mw = require("./../mw/inputmask/index");
                var inputmaskSrc = ["params", "headers", "query"];
                if (soajs.param.cookieParser) {
                    inputmaskSrc.push("cookies");
                }
                if (soajs.param.bodyParser) {
                    inputmaskSrc.push("body");
                }

                soajs.inputmask = inputmask_mw(soajs.param, inputmaskSrc);
                _self.log.info("IMFV middleware initialization done.");
            }
            else {
                _self.log.info("IMFV middleware initialization skipped.");
            }

            if (soajs.param.bodyParser && soajs.param.oauth) {
                var oauthserver = require('oauth2-server');
                _self.oauth = oauthserver({
                    model: provision.oauthModel,
                    grants: registry.serviceConfig.oauth.grants,
                    debug: registry.serviceConfig.oauth.debug
                });

                soajs.oauthService = soajs.param.oauthService || {"name": "oauth", "tokenApi": "/token"};
                if (!soajs.oauthService.name) {
                    soajs.oauthService.name = "oauth";
                }
                if (!soajs.oauthService.tokenApi) {
                    soajs.oauthService.tokenApi = "/token";
                }

                soajs.oauth = _self.oauth.authorise();
                _self.log.info("oAuth middleware initialization done.");
            }
            else {
                _self.log.info("oAuth middleware initialization skipped.");
            }

            if (soajs.param.awareness) {
                var awareness_mw = require("./../mw/awareness/index");
                _self.app.use(awareness_mw({
                    "serviceName": soajs.param.serviceName,
                    "serviceGroup": soajs.param.serviceGroup,
                    "serviceVersion": soajs.param.serviceVersion,
                    "designatedPort": soajs.param.servicePort,
                    "extKeyRequired": soajs.param.extKeyRequired,
                    "requestTimeout": soajs.param.requestTimeout,
                    "requestTimeoutRenewal": soajs.param.requestTimeoutRenewal,
                    "awareness": soajs.param.awareness,
                    "serviceIp": soajs.param.serviceIp,
                    "apiList": soajs.apiList,
                    "log": _self.log
                }));
                _self.log.info("Awareness middleware initialization done.");
            }
            else {
                _self.log.info("Awareness middleware initialization skipped.");
            }

            if (soajs.param.awarenessEnv) {
                var awarenessEnv_mw = require("./../mw/awarenessEnv/index");
                _self.app.use(awarenessEnv_mw({
                    "awarenessEnv": soajs.param.awarenessEnv,
                    "log": _self.log
                }));
                _self.log.info("AwarenessEnv middleware initialization done.");
            }
            else {
                _self.log.info("AwarenessEnv middleware initialization skipped.");
            }

            var service_mw = require("./../mw/service/index");
            soajs.serviceMW = service_mw({"soajs": soajs, "app": _self.app, "param": soajs.param});
            //_self.app.use(service_mw({"soajs": soajs, "app": _self.app, "param": soajs.param}));
            _self.log.info("SOAJS Service middleware initialization done.");

            if (soajs.param.roaming) {
                var roaming_mw = require("./../mw/roaming/index");
                _self.app.use(roaming_mw({"app": _self.app}));
                _self.log.info("SOAJS Roaming middleware initialization done.");
            }

            //Expose some core function after init
            _self.getCustomRegistry = function () {
                return core.registry.getCustom();
            };
	
	        //exposing provision functionality to generate keys
	        _self.provision = {
		        "init": provision.init,
		        "generateInternalKey": provision.generateInternalKey,
		        "generateExtKey": provision.generateExtKey
	        };

	        _self.registry = {
		        "loadByEnv": core.registry.loadByEnv
	        };
	        
            callback();
        });
    }
};

/**
 *
 */
service.prototype.start = function (cb) {
    var _self = this;
    if (_self.app && _self.app.soajs) {
        _self.log.info("Service about to start ...");
        var registry = core.registry.get();
        _self.app.all('*', function (req, res) {
            req.soajs.log.error(151, 'Unknown API : ' + req.path);
            res.jsonp(req.soajs.buildResponse(core.error.getError(151)));
        });

        _self.app.use(logErrors);
        _self.app.use(clientErrorHandler);
        _self.app.use(errorHandler);

        _self.log.info("Loading Service Provision ...");
        provision.init(registry.coreDB.provision, _self.log);
        provision.loadProvision(function (loaded) {
            if (loaded) {
                _self.log.info("Service provision loaded.");
                _self.log.info("Starting Service ...");
                _self.app.httpServer = _self.app.listen(_self.app.soajs.serviceConf.info.port, function (err) {
                    if (err) {
                        _self.log.error(core.error.generate(141));
                        _self.log.error(err);
                    }
                    else {
                        core.registry.registerHost({
                            "serviceName": _self.app.soajs.param.serviceName,
                            "serviceVersion": _self.app.soajs.param.serviceVersion,
                            "serviceIp": _self.app.soajs.param.serviceIp,
                            "serviceHATask": _self.app.soajs.param.serviceHATask
                        }, registry, function (registered) {
                            if (registered)
                                _self.log.info("Host IP [" + _self.app.soajs.param.serviceIp + "] for service [" + _self.app.soajs.param.serviceName + "@" + _self.app.soajs.param.serviceVersion + "] successfully registered.");
                            else
                                _self.log.warn("Unable to register host IP [" + _self.app.soajs.param.serviceIp + "] for service [" + _self.app.soajs.param.serviceName + "@" + _self.app.soajs.param.serviceVersion + "]");

                            _self.log.info(_self.app.soajs.param.serviceName + " service started on port: " + _self.app.soajs.serviceConf.info.port);

                            if (autoRegHost) {
                                _self.log.info("Initiating service auto register for awareness ...");
                                core.registry.autoRegisterService({
                                    "name": _self.app.soajs.param.serviceName,
                                    "serviceIp": _self.app.soajs.param.serviceIp,
                                    "serviceVersion": _self.app.soajs.param.serviceVersion,
                                    "serviceHATask": _self.app.soajs.param.serviceHATask,
                                    "what": "services"
                                }, function (err, registered) {
                                    if (err) {
                                        _self.log.warn('Unable to trigger autoRegisterService awareness for controllers: ' + err);
                                    } else if (registered) {
                                        _self.log.info('The autoRegisterService @ controllers for [' + _self.app.soajs.param.serviceName + '@' + _self.app.soajs.param.serviceIp + '] successfully finished.');
                                    }
                                });
                            }
                            else {
                                _self.log.info("Service auto register for awareness, skipped.");
                            }
                        });
                    }
                    if (cb) {
                        cb(err);
                    }
                });

                //MAINTENANCE Service Routes
                _self.log.info("Adding Service Maintenance Routes ...");
                var maintenancePort = _self.app.soajs.serviceConf.info.port + _self.app.soajs.serviceConf._conf.ports.maintenanceInc;
                var maintenanceResponse = function (req, route) {
                    var response = {
                        'result': false,
                        'ts': Date.now(),
                        'service': {
                            'service': _self.app.soajs.param.serviceName.toUpperCase(),
                            'type': 'rest',
                            'route': route || req.path
                        }
                    };
                    return response;
                };
                _self.appMaintenance.get("/heartbeat", function (req, res) {
                    var response = maintenanceResponse(req);
                    response['result'] = true;
                    res.jsonp(response);
                });
                _self.appMaintenance.get("/reloadRegistry", function (req, res) {
                    core.registry.reload({
                        "serviceName": _self.app.soajs.param.serviceName,
                        "serviceGroup": _self.app.soajs.param.serviceGroup,
                        "serviceVersion": _self.app.soajs.param.serviceVersion,
                        "designatedPort": _self.app.soajs.param.servicePort,
                        "extKeyRequired": _self.app.soajs.param.extKeyRequired,
                        "requestTimeout": _self.app.soajs.param.requestTimeout,
                        "requestTimeoutRenewal": _self.app.soajs.param.requestTimeoutRenewal,
                        "awareness": _self.app.soajs.param.awareness,
                        "serviceIp": _self.app.soajs.param.serviceIp
                    }, function (err, reg) {
                        if (err) {
                            _self.log.warn("Failed to load registry. reusing from previous load. Reason: " + err.message);
                        }
                        var response = maintenanceResponse(req);
                        response['result'] = true;
                        response['data'] = reg;
                        res.jsonp(response);

                    });
                });
                _self.appMaintenance.get("/loadProvision", function (req, res) {
                    provision.loadProvision(function (loaded) {
                        var response = maintenanceResponse(req);
                        response['result'] = loaded;
                        res.jsonp(response);
                    });
                });
                _self.appMaintenance.get("/resourceInfo", function (req, res) {
                    var response = maintenanceResponse(req);
                    var data = {};
                    data['hostname'] = os.hostname();
                    data['uptime'] = os.uptime();
                    data['cpus'] = os.cpus();
                    data['net'] = os.networkInterfaces();
                    data['mem'] = {'total': os.totalmem(), 'free': os.freemem()};
                    data['load'] = os.loadavg();
                    response['result'] = true;
                    response['data'] = data;
                    res.jsonp(response);
                });
                _self.appMaintenance.all('*', function (req, res) {
                    var response = maintenanceResponse(req, "heartbeat");
                    response['result'] = true;
                    res.jsonp(response);
                });
                _self.appMaintenance.httpServer = _self.appMaintenance.listen(maintenancePort, function (err) {
                    _self.log.info(_self.app.soajs.param.serviceName + " service maintenance is listening on port: " + maintenancePort);
                });
            }
        });
    } else {
        if (cb && typeof cb === "function") {
            cb(new Error('Failed starting service'));
        } else {
            throw new Error('Failed starting service');
        }
    }
};

service.prototype.stop = function (cb) {
    var _self = this;
    _self.log.info('stopping service[' + _self.app.soajs.param.serviceName + '] on port:', _self.app.soajs.serviceConf.info.port);
    _self.app.httpServer.close(function (err) {
        _self.appMaintenance.httpServer.close(function (err) {
            if (cb) {
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
    if (restApp.app.soajs.oauthService && restApp.app.soajs.param.serviceName === restApp.app.soajs.oauthService.name && args[0] === restApp.app.soajs.oauthService.tokenApi) {
        return args;
    }

    var oauthExec = function (req, res, next) {
        if (req.soajs.servicesConfig && req.soajs.servicesConfig[restApp.app.soajs.oauthService] && req.soajs.servicesConfig[restApp.app.soajs.oauthService].disabled)
            return next();
        return restApp.app.soajs.oauth(req, res, next);
    };

    if (restApp.app.soajs.oauth) {
        var len = args.length;
        var argsNew = [];
        argsNew.push(args[0]);
        argsNew.push(oauthExec);
        for (var i = 1; i < len; i++) {
            argsNew[i + 1] = args[i];
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
    if (restApp.app.soajs.inputmask) {
        var len = args.length;
        var argsNew = [];
        argsNew.push(args[0]);
        argsNew.push(restApp.app.soajs.inputmask);
        for (var i = 1; i < len; i++) {
            argsNew[i + 1] = args[i];
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
function injectServiceMW(restApp, args) {
    if (restApp.app.soajs.serviceMW) {
        var len = args.length;
        var argsNew = [];
        argsNew.push(args[0]);
        argsNew.push(restApp.app.soajs.serviceMW);
        for (var i = 1; i < len; i++) {
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
function isSOAJready(app, log) {
    if (app && app.soajs) {
        return true;
    }
    log.info("Can't attach route because soajs express app is not defined");
    return false;
}
/**
 *
 * @param self
 * @param args
 * @returns {*}
 */
function routeInjection (_self, args){
    args = injectInputmask(_self, args);
    args = injectServiceMW (_self, args);
    args = injectOauth(_self, args);
    return args;
}
/**
 *
 */
service.prototype.all = function () {
    var _self = this;
    if (!isSOAJready(_self.app, _self.log)) return;
    var args = routeInjection(_self, arguments);
    _self.app.all.apply(_self.app, args);
};
/**
 *
 */
service.prototype.get = function () {
    var _self = this;
    if (!isSOAJready(_self.app, _self.log)) return;
    var args = routeInjection(_self, arguments);
    _self.app.get.apply(_self.app, args);
};
/**
 *
 */
service.prototype.post = function () {
    var _self = this;
    if (!isSOAJready(_self.app, _self.log)) return;
    var args = routeInjection(_self, arguments);
    _self.app.post.apply(_self.app, args);
};

/**
 *
 */
service.prototype.put = function () {
    var _self = this;
    if (!isSOAJready(_self.app, _self.log)) return;
    var args = routeInjection(_self, arguments);
    _self.app.put.apply(_self.app, args);
};
/**
 *
 */
service.prototype.delete = function () {
    var _self = this;
    if (!isSOAJready(_self.app, _self.log)) return;
    var args = routeInjection(_self, arguments);
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
    if (typeof err === "number") {
        req.soajs.log.error(core.error.generate(err));
        return next(err);
    }
    if (typeof err === "object") {
        if (err.code && err.message) {
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
    if (req.xhr) {
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
    if (err.code && err.msg) {
        res.jsonp(req.soajs.buildResponse(err));
    } else {
        res.jsonp(req.soajs.buildResponse(core.error.getError(err)));
    }
}

module.exports = service;