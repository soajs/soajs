'use strict';

var path = require('path');
var os = require('os');
var fs = require('fs');

var coreModules = require("soajs.core.modules");
var core = coreModules.core;
//var provision = coreModules.provision;
var lib = require("soajs.core.libs");

var express = require("./../classes/express");

var utils = require("./../utilities/utils");

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
        param.session = false;
        param.awareness = false;
        param.awarenessEnv = false;
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
    soajs.param.awarenessEnv = soajs.param.awarenessEnv || false;
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
    if (soajs.param.hasOwnProperty("oauth"))
        soajs.param.oauth = soajs.param.oauth;
    else
        soajs.param.oauth = true;

    //automatically add maintenance to service
    if (!soajs.param.maintenance)
        soajs.param.maintenance = {};
    soajs.param.maintenance.port = {"type": "maintenance"};
    soajs.param.maintenance.readiness = "/heartbeat";
    if (!soajs.param.maintenance.commands)
        soajs.param.maintenance.commands = [];
    soajs.param.maintenance.commands.push({"label": "Releoad Registry", "path": "/reloadRegistry", "icon": "registry"});
    soajs.param.maintenance.commands.push({"label": "Resource Info", "path": "/resourceInfo", "icon": "info"});


    var fetchedHostIp = null;
    var serviceIpNotDetected = false;
    if (!autoRegHost && !process.env.SOAJS_DEPLOY_HA) {
        soajs.param.serviceIp = '127.0.0.1';
    }
    let loadVersion = function () {
        let version = {};
        let core_packageJson = require("./../package.json");
        if (core_packageJson && core_packageJson.version)
            version.core = core_packageJson.version;
        if (soajs.param && soajs.param.packagejson) {
            if (soajs.param.packagejson.version)
                version.service = soajs.param.packagejson.version;
            if (soajs.param.packagejson.dependencies)
                version.dependencies = soajs.param.packagejson.dependencies;
        }
        else {
            if (fs.existsSync(process.cwd() + "/package.json")) {
                let service_packageJson = require(process.cwd() + "/package.json");
                if (service_packageJson) {
                    if (service_packageJson.version)
                        version.service = service_packageJson.version;
                    if (service_packageJson.dependencies)
                        version.dependencies = service_packageJson.dependencies;
                }
            }
        }
        return version;
    };
    let versions = loadVersion();
    _self.maintenanceResponse = function (req, route) {
        var response = {
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
    }
    else {
        resume();
    }

    function resume() {
        soajs.apiList = extractAPIsList(soajs.param.schema);

        core.registry.load({
            "serviceName": soajs.param.serviceName,
            "serviceGroup": soajs.param.serviceGroup,
            "serviceVersion": soajs.param.serviceVersion,
            "designatedPort": soajs.param.servicePort,
            "extKeyRequired": soajs.param.extKeyRequired,
            "requestTimeout": soajs.param.requestTimeout,
            "requestTimeoutRenewal": soajs.param.requestTimeoutRenewal,
            "serviceIp": soajs.param.serviceIp,
            "swagger": soajs.param.swagger,
            "urac": soajs.param.urac,
            "urac_Profile": soajs.param.urac_Profile,
            "urac_ACL": soajs.param.urac_ACL,
            "urac_Config": soajs.param.urac_Config,
            "urac_GroupConfig": soajs.param.urac_GroupConfig,
            "tenant_Profile": soajs.param.tenant_Profile,
            "provision_ACL": soajs.param.provision_ACL,
            "oauth": soajs.param.oauth,
            "apiList": soajs.apiList,
            "maintenance": soajs.param.maintenance
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

            if (process.env.SOAJS_SOLO && process.env.SOAJS_SOLO === "true")
                _self.log.info("SOAJS is in SOLO mode, the following got turned OFF [extKeyRequired, session, oauth, awareness, awarenessEnv].");

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
            _self.app.use(response_mw({"errors": soajs.param.errors, "status": soajs.param.status}));

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
                var MongoStore = coreModules.mongoStore(session);
                var store = new MongoStore(registry.coreDB.session);
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

            if (soajs.param.awareness) {
                var awareness_mw = require("./../mw/awareness/index");
                _self.app.use(awareness_mw.getMw({
                    "serviceName": soajs.param.serviceName,
                    "serviceGroup": soajs.param.serviceGroup,
                    "serviceVersion": soajs.param.serviceVersion,
                    "designatedPort": soajs.param.servicePort,
                    "extKeyRequired": soajs.param.extKeyRequired,
                    "requestTimeout": soajs.param.requestTimeout,
                    "requestTimeoutRenewal": soajs.param.requestTimeoutRenewal,
                    "awareness": soajs.param.awareness,
                    "serviceIp": soajs.param.serviceIp,
                    "log": _self.log
                }));
                _self.log.info("Awareness middleware initialization done.");
            }
            else {
                _self.log.info("Awareness middleware initialization skipped.");
            }

            if (soajs.param.awarenessEnv) {
                var awarenessEnv_mw = require("./../mw/awarenessEnv/index");
                _self.app.use(awarenessEnv_mw.getMw({
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
            _self.log.info("SOAJS Service middleware initialization done.");

            //Expose some core function after init
            _self.getCustomRegistry = function () {
                return core.registry.getCustom();
            };

            _self.registry = {
                "loadByEnv": core.registry.loadByEnv,
                "get": core.registry.get
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
        let finalDataPort = _self.app.soajs.serviceConf.info.port;
        if (!process.env.SOAJS_DEPLOY_HA) {
            if (process.env.SOAJS_SRVPORT) {
                finalDataPort = parseInt(process.env.SOAJS_SRVPORT);
                if (isNaN(finalDataPort)) {
                    throw new Error("Invalid port value detected in SOAJS_SRVPORT environment variable, port value is not a number!");
                }
            }
            else if (process.env.SOAJS_ENV && process.env.SOAJS_ENV.toUpperCase() !== 'DASHBOARD') {
                finalDataPort += _self.app.soajs.serviceConf._conf.ports.controller;
            }
        }

        _self.app.httpServer = _self.app.listen(finalDataPort, function (err) {
            if (err) {
                _self.log.error(core.error.generate(141));
                _self.log.error(err);
            }
            else if (!process.env.SOAJS_DEPLOY_HA) {
                core.registry.registerHost({
                    "serviceName": _self.app.soajs.param.serviceName,
                    "servicePort": finalDataPort,//_self.app.soajs.param.servicePort,
                    "serviceVersion": _self.app.soajs.param.serviceVersion,
                    "serviceIp": _self.app.soajs.param.serviceIp,
                    "serviceHATask": _self.app.soajs.param.serviceHATask
                }, registry, function (registered) {
                    if (registered)
                        _self.log.info("Host IP [" + _self.app.soajs.param.serviceIp + "] for service [" + _self.app.soajs.param.serviceName + "@" + _self.app.soajs.param.serviceVersion + "] successfully registered.");
                    else
                        _self.log.warn("Unable to register host IP [" + _self.app.soajs.param.serviceIp + "] for service [" + _self.app.soajs.param.serviceName + "@" + _self.app.soajs.param.serviceVersion + "]");

                    _self.log.info(_self.app.soajs.param.serviceName + " service started on port: " + finalDataPort);

                    if (autoRegHost) {
                        _self.log.info("Initiating service auto register for awareness ...");
                        core.registry.autoRegisterService({
                            "name": _self.app.soajs.param.serviceName,
                            "port": finalDataPort,
                            "oauth": _self.app.soajs.param.oauth,
                            "urac": _self.app.soajs.param.urac,
                            "urac_Profile": _self.app.soajs.param.urac_Profile,
                            "urac_ACL": _self.app.soajs.param.urac_ACL,
                            "urac_Config": _self.app.soajs.param.urac_Config,
                            "urac_GroupConfig": _self.app.soajs.param.urac_GroupConfig,
                            "tenant_Profile": _self.app.soajs.param.tenant_Profile,
                            "provision_ACL": _self.app.soajs.param.provision_ACL,
                            "serviceIp": _self.app.soajs.param.serviceIp,
                            "serviceVersion": _self.app.soajs.param.serviceVersion,
                            "serviceHATask": _self.app.soajs.param.serviceHATask,
                            "what": "services",
                            "mw": _self.app.soajs.param.mw || false
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
        var loadVersion = function () {
            var rootPath = process.cwd();
            var version = null;
            if (fs.existsSync(rootPath + "/package.json")) {
                var packageJson = require(rootPath + "/package.json");
                version = packageJson.version;
            }
            return version;
        };
        //calculate the maintenance port value
        var maintenancePort = _self.app.soajs.serviceConf.info.port + _self.app.soajs.serviceConf._conf.ports.maintenanceInc;
        if (!process.env.SOAJS_DEPLOY_HA) {
            if (process.env.SOAJS_SRVPORT) {
                let envPort = parseInt(process.env.SOAJS_SRVPORT);
                if (isNaN(envPort)) {
                    throw new Error("Invalid port value detected in SOAJS_SRVPORT environment variable, port value is not a number!");
                }
                maintenancePort = envPort + _self.app.soajs.serviceConf._conf.ports.maintenanceInc;
            }
            else if (process.env.SOAJS_ENV && process.env.SOAJS_ENV.toUpperCase() !== 'DASHBOARD') {
                maintenancePort += _self.app.soajs.serviceConf._conf.ports.controller;
            }
        }

        _self.appMaintenance.get("/heartbeat", function (req, res) {
            var response = _self.maintenanceResponse(req);
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
                "serviceIp": _self.app.soajs.param.serviceIp
            }, function (err, reg) {
                if (err) {
                    _self.log.warn("Failed to load registry. reusing from previous load. Reason: " + err.message);
                }
                var response = _self.maintenanceResponse(req);
                response['result'] = true;
                response['data'] = reg;
                res.jsonp(response);

            });
        });
        _self.appMaintenance.get("/resourceInfo", function (req, res) {
            var response = _self.maintenanceResponse(req);
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
            var response = _self.maintenanceResponse(req, "heartbeat");
            response['result'] = true;
            res.jsonp(response);
        });
        _self.appMaintenance.httpServer = _self.appMaintenance.listen(maintenancePort, function (err) {
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
function routeInjection(_self, args) {
    args = injectInputmask(_self, args);
    args = injectServiceMW(_self, args);
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

module.exports = service;