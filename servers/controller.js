'use strict';

var connect = require('connect');
var http = require('http');
//var request = require('request');
var httpProxy = require('http-proxy');
var url = require('url');

var coreModules = require("soajs.core.modules");
var core = coreModules.core;
var provision = coreModules.provision;
var soajsLib = require("soajs.core.libs");
var soajsUtils = soajsLib.utils;

var favicon_mw = require('./../mw/favicon/index');
var cors_mw = require('./../mw/cors/index');
var soajs_mw = require('./../mw/soajs/index');
var response_mw = require('./../mw/response/index');
var enhancer_mw = require('./../mw/enhancer/index');
var awareness_mw = require('./../mw/awareness/index');
var awarenessEnv_mw = require("./../mw/awarenessEnv/index");
var controller_mw = require('./../mw/controller/index');
var version_mw = require('./../mw/version/index');

var utils = require("./../utilities/utils");

var autoRegHost = process.env.SOAJS_SRV_AUTOREGISTERHOST || true;
if (autoRegHost && typeof(autoRegHost) !== 'boolean') {
    autoRegHost = (autoRegHost === 'true');
}

var regEnvironment = (process.env.SOAJS_ENV || "dev");
regEnvironment = regEnvironment.toLowerCase();


/**
 *
 */
function controller(param) {
    var _self = this;
    param = param || {};
    _self.awareness = true;
    _self.serviceName = "controller";
    _self.serviceVersion = "1";
    _self.serviceIp = process.env.SOAJS_SRVIP || null;
    _self.serviceHATask = null;

    //automatically add maintenance to service
    if (!_self.maintenance)
        _self.maintenance = {};
    _self.maintenance.port = {"type": "maintenance"};
    _self.maintenance.readiness = "/heartbeat";
    if (!_self.maintenance.commands)
        _self.maintenance.commands = [];
    _self.maintenance.commands.push({"label": "Releoad Registry", "path": "/reloadRegistry", "icon": "registry"});
    _self.maintenance.commands.push({"label": "Statistics Info", "path": "/awarenessStat", "icon": "awareness"});
    _self.maintenance.commands.push({"label": "Releoad Provision Info", "path": "/loadProvision", "icon": "provision"});

    //TODO: we might not need bodyParser
    param.bodyParser = false;

    _self.soajs = {"param": param};
}

controller.prototype.init = function (callback) {
    var _self = this;
    var fetchedHostIp = null;
    var serviceIpNotDetected = false;
    if (!autoRegHost && !process.env.SOAJS_DEPLOY_HA) {
        _self.serviceIp = '127.0.0.1';
    }

    if (!_self.serviceIp && !(process.env.SOAJS_DEPLOY_HA === 'true')) {
        core.getHostIp(function (getHostIpResponse) {
            fetchedHostIp = getHostIpResponse;
            if (fetchedHostIp && fetchedHostIp.result) {
                _self.serviceIp = fetchedHostIp.ip;
                if (fetchedHostIp.extra && fetchedHostIp.extra.swarmTask) {
                    _self.serviceHATask = fetchedHostIp.extra.swarmTask;
                }
            } else {
                serviceIpNotDetected = true;
                _self.serviceIp = "127.0.0.1";
            }
            resume();
        });
    }
    else {
        resume();
    }

    function resume() {
        core.registry.load({
            "serviceName": _self.serviceName,
            "serviceVersion": _self.serviceVersion,
            "apiList": null,
            "serviceIp": _self.serviceIp,
            "maintenance": _self.maintenance
        }, function (reg) {
            _self.registry = reg;
            _self.log = core.getLogger(_self.serviceName, _self.registry.serviceConfig.logger);
            if (fetchedHostIp) {
                if (!fetchedHostIp.result) {
                    _self.log.warn("Unable to find the service host ip. The service will NOT be registered for awareness.");
                    _self.log.info("IPs found: ", fetchedHostIp.extra.ips);
                    if (serviceIpNotDetected) {
                        _self.log.warn("The default service IP has been used [" + _self.serviceIp + "]");
                    }
                }
                else {
                    _self.log.info("The IP registered for service [" + _self.serviceName + "] awareness : ", fetchedHostIp.ip);
                }
            }

            var app = connect();
            app.use(favicon_mw());
            app.use(soajs_mw({
                "serviceName": _self.serviceName,
                "log": _self.log
            }));
            app.use(cors_mw());
            app.use(response_mw({"controllerResponse": true}));

            _self.log.info("Loading Provision ...");
            let dbConfig = _self.registry.coreDB.provision;
            if (_self.registry.coreDB.oauth) {
                dbConfig = {
                    "provision": _self.registry.coreDB.provision,
                    "oauth": _self.registry.coreDB.oauth
                };
            }
            provision.init(dbConfig, _self.log);
            provision.loadProvision(function (loaded) {
                if (loaded) {
                    _self.log.info("Service provision loaded.");
                    _self.server = http.createServer(app);

                    let maintenanceResponse = function (parsedUrl, route) {
                        let response = {
                            'result': false,
                            'ts': Date.now(),
                            'service': {
                                'service': _self.serviceName.toUpperCase(),
                                'type': 'rest',
                                'route': route || parsedUrl.pathname
                            }
                        };
                        return response;
                    };
                    let reloadRegistry = function (parsedUrl, cb) {
                        core.registry.reload({
                            "serviceName": _self.serviceName,
                            "serviceVersion": null,
                            "apiList": null,
                            "serviceIp": _self.serviceIp
                        }, function (err, reg) {
                            let response = maintenanceResponse(parsedUrl);
                            if (err) {
                                _self.log.warn("Failed to load registry. reusing from previous load. Reason: " + err.message);
                            } else {
                                response['result'] = true;
                                response['data'] = reg;
                            }
                            return cb(response);
                        });
                    };
                    let proxy = httpProxy.createProxyServer({});
                    proxy.on('error', function (error, req, res) {
                        _self.log.error('Failed to proxy ' + req.url);
                        _self.log.error('Internal proxy error: ' + error);

                        res.writeHead(200, {'Content-Type': 'application/json'});
                        let parsedUrl = url.parse(req.url, true);
                        let response = maintenanceResponse(parsedUrl, '/proxySocket');
                        return res.end(JSON.stringify(response));
                    });

                    _self.serverMaintenance = http.createServer(function (req, res) {
                        req.soajs = {};
                        if (req.url === '/favicon.ico') {
                            res.writeHead(200, {'Content-Type': 'image/x-icon'});
                            return res.end();
                        }
                        var parsedUrl = url.parse(req.url, true);

                        if (parsedUrl.pathname === '/reloadRegistry') {
                            reloadRegistry(parsedUrl, (response) => {
                                res.writeHead(200, {'Content-Type': 'application/json'});
                                return res.end(JSON.stringify(response));
                            });
                        }
                        else if (parsedUrl.pathname === '/awarenessStat') {
                            res.writeHead(200, {'Content-Type': 'application/json'});
                            let tmp = core.registry.get();
                            let response = maintenanceResponse(parsedUrl);
                            if (tmp && (tmp.services || tmp.daemons)) {
                                response['result'] = true;
                                response['data'] = {"services": tmp.services, "daemons": tmp.daemons};
                            }

                            if (process.env.SOAJS_DEPLOY_HA) {
                                awareness_mw.getMw({
                                    "awareness": _self.awareness,
                                    "serviceName": _self.serviceName,
                                    "log": _self.log,
                                    "serviceIp": _self.serviceIp
                                });
                            }
                            else if (parsedUrl.query && parsedUrl.query.update) {
                                core.registry.addUpdateEnvControllers({
                                    "ip": _self.serviceIp,
                                    "ts": response.ts,
                                    "data": soajsUtils.cloneObj(response.data),
                                    "env": regEnvironment
                                }, function (error) {
                                    if (error) {
                                        _self.log.error(error);
                                    }
                                });
                            }

                            return res.end(JSON.stringify(response));
                        }
                        else if (parsedUrl.pathname === '/register') {
                            if (!process.env.SOAJS_DEPLOY_HA) {
                                let body = "";
                                req.on('data', function (chunk) {
                                    body += chunk;
                                });
                                req.on('end', function () {
                                    if (body)
                                        body = JSON.parse(body);

                                    if (parsedUrl.query.serviceHATask) {
                                        reloadRegistry(parsedUrl, (response) => {
                                            res.writeHead(200, {'Content-Type': 'application/json'});
                                            return res.end(JSON.stringify(response));
                                        });
                                    }
                                    else {
                                        res.writeHead(200, {'Content-Type': 'application/json'});
                                        let response = maintenanceResponse(parsedUrl);

                                        let infoObj = parsedUrl.query;
                                        if ('POST' === req.method && body) {
                                            infoObj = body;
                                        }

                                        if (!soajsLib.version.validate(infoObj.version)) {
                                            _self.log.warn("Failed to register service for [" + infoObj.name + "] version should be of format [1.1]");
                                            res.writeHead(200, {'Content-Type': 'application/json'});
                                            return res.end(JSON.stringify(response));
                                        }

                                        let regOptions = {
                                            "name": infoObj.name,
                                            "group": infoObj.group,
                                            "port": parseInt(infoObj.port),
                                            "ip": infoObj.ip,
                                            "type": infoObj.type,
                                            "version": "" + infoObj.version
                                        };

                                        if (regOptions.type === "service") {
                                            regOptions["swagger"] = infoObj.swagger;
                                            regOptions["oauth"] = infoObj.oauth;
                                            regOptions["urac"] = infoObj.urac;
                                            regOptions["urac_Profile"] = infoObj.urac_Profile;
                                            regOptions["urac_ACL"] = infoObj.urac_ACL;
                                            regOptions["urac_Config"] = infoObj.urac_Config;
                                            regOptions["urac_GroupConfig"] = infoObj.urac_GroupConfig;
                                            regOptions["tenant_Profile"] = infoObj.tenant_Profile;
                                            regOptions["provision_ACL"] = infoObj.provision_ACL;
                                            regOptions["extKeyRequired"] = infoObj.extKeyRequired;
                                            regOptions["requestTimeout"] = parseInt(infoObj.requestTimeout);
                                            regOptions["requestTimeoutRenewal"] = parseInt(infoObj.requestTimeoutRenewal);

                                            if (body && body.apiList)
                                                regOptions["apiList"] = body.apiList;
                                        }

                                        regOptions["mw"] = infoObj.mw;

                                        if (body && body.maintenance)
                                            regOptions["maintenance"] = body.maintenance;

                                        core.registry.register(
                                            regOptions,
                                            function (err, data) {
                                                if (!err) {
                                                    response['result'] = true;
                                                    response['data'] = data;
                                                }
                                                else {
                                                    _self.log.warn("Failed to register service for [" + infoObj.name + "] " + err.message);
                                                }
                                                return res.end(JSON.stringify(response));
                                            });
                                    }
                                });
                            }
                            else {
                                res.writeHead(200, {'Content-Type': 'application/json'});
                                let response = maintenanceResponse(parsedUrl);
                                return res.end(JSON.stringify(response));
                            }
                        }
                        else if (parsedUrl.pathname.match('/proxySocket/.*')) {

                            req.url = req.url.split('/proxySocket')[1];
                            req.headers.host = '127.0.0.1';

                            _self.log.info('Incoming proxy request for ' + req.url);

                            let haTarget;

                            haTarget = {
                                socketPath: process.env.SOAJS_SWARM_UNIX_PORT || '/var/run/docker.sock'
                            };
                            proxy.web(req, res, {target: haTarget});
                        }
                        else if (parsedUrl.pathname === '/loadProvision') {
                            provision.loadProvision(function (loaded) {
                                let response = maintenanceResponse(parsedUrl);
                                response['result'] = loaded;
                                return res.end(JSON.stringify(response));
                            });
                        }
                        else if (parsedUrl.pathname === '/getRegistry') {
                            let reqEnv = parsedUrl.query.env;
                            let reqServiceName = parsedUrl.query.serviceName;

                            if (!reqEnv) {
                                reqEnv = regEnvironment;
                            }
                            core.registry.loadByEnv({
                                "envCode": reqEnv,
                                "serviceName": "controller",
                                "donotBbuildSpecificRegistry": false
                            }, function (err, reg) {
                                let response = maintenanceResponse(parsedUrl);
                                if (err) {
                                    _self.log.error(reqServiceName, err);
                                }
                                else {
                                    response['result'] = true;
                                    response['data'] = {}; //soajsUtils.cloneObj(reg);
                                }
                                if (reg) {
                                    if (reg.timeLoaded)
                                        response['data'].timeLoaded = reg.timeLoaded;
                                    if (reg.name)
                                        response['data'].name = reg.name;
                                    if (reg.environment)
                                        response['data'].environment = reg.environment;
                                    if (reg.coreDB)
                                        response['data'].coreDB = reg.coreDB;
                                    if (reg.tenantMetaDB)
                                        response['data'].tenantMetaDB = reg.tenantMetaDB;
                                    if (reg.serviceConfig) {
                                        response['data'].serviceConfig = soajsUtils.cloneObj(reg.serviceConfig);
                                        delete response['data'].serviceConfig.cors;
                                        if (reqServiceName !== "oauth")
                                            delete response['data'].serviceConfig.oauth;
                                    }
                                    if (reg.deployer)
                                        response['data'].deployer = reg.deployer;
                                    if (reg.custom)
                                        response['data'].custom = reg.custom;
                                    if (reg.resources)
                                        response['data'].resources = reg.resources;
                                    response['data'].services = {};
                                    if (reg.services) {
                                        if (reg.services.controller)
                                            response['data'].services.controller = reg.services.controller;
                                        if (reg.services[reqServiceName]) {
                                            response['data'].services[reqServiceName] = soajsUtils.cloneObj(reg.services[reqServiceName]);
                                            delete response['data'].services[reqServiceName].versions;
                                        }
                                    }
                                }
                                awareness_mw.getMw({
                                    "awareness": _self.awareness,
                                    "serviceName": _self.serviceName,
                                    "log": _self.log,
                                    "serviceIp": _self.serviceIp,
	                                "doNotRebuildCache": true
                                })(req, res, () => {
                                    req.soajs.awareness.getHost('controller', function (controllerHostInThisEnvironment) {
                                        if (reg && reg.serviceConfig && reg.serviceConfig.ports && reg.serviceConfig.ports.controller) {
                                            response['data'].awareness = {
                                                "host": controllerHostInThisEnvironment,
                                                "port": reg.serviceConfig.ports.controller
                                            };
                                        }
                                        res.writeHead(200, {'Content-Type': 'application/json'});
                                        return res.end(JSON.stringify(response));
                                    });
                                });
                            });
                        }
                        else {
                            let heartbeat = function (res) {
                                res.writeHead(200, {'Content-Type': 'application/json'});
                                let response = maintenanceResponse(parsedUrl);
                                response['result'] = true;
                                res.end(JSON.stringify(response));
                            };
                            if (req.url === '/heartbeat') {
                                return heartbeat(res);
                            }
                            return heartbeat(res);
                        }
                    });

                    app.use(awareness_mw.getMw({
                        "awareness": _self.awareness,
                        "serviceName": _self.serviceName,
                        "log": _self.log,
                        "serviceIp": _self.serviceIp
                    }));
                    _self.log.info("Awareness middleware initialization done.");

                    //added mw awarenessEnv so that proxy can use req.soajs.awarenessEnv.getHost('dev', cb)
                    app.use(awarenessEnv_mw.getMw({
                        "awarenessEnv": true,
                        "log": _self.log
                    }));
                    _self.log.info("AwarenessEnv middleware initialization done.");

                    if (_self.soajs.param.bodyParser) {
                        var bodyParser = require('body-parser');
                        var options = (_self.soajs.param.bodyParser.limit) ? {limit: _self.soajs.param.bodyParser.limit} : null;
                        app.use(bodyParser.json(options));
                        app.use(bodyParser.urlencoded({extended: true}));
                        _self.log.info("Body-Parse middleware initialization done.");
                    }
                    else {
                        _self.log.info("Body-Parser middleware initialization skipped.");
                    }

                    app.use(enhancer_mw({}));

                    app.use(version_mw());

                    app.use(controller_mw());


                    if (_self.registry.serviceConfig.oauth) {

                        let oauth_mw = require("./../mw/oauth/index");
                        // NOTE: oauth_mw is set on soajs.oauth and is triggered from inside mt_mw
                        _self.soajs.oauth = oauth_mw({
                            "soajs": _self.soajs,
                            "serviceConfig": _self.registry.serviceConfig,
                            "model": provision.oauthModel
                        });

                        _self.log.info("oAuth middleware initialization done.");
                    }

                    var mt_mw = require("./../mw/mt/index");
                    app.use(mt_mw({"soajs": _self.soajs, "app": app, "param": _self.soajs.param}));
                    _self.log.info("SOAJS MT middleware initialization done.");

                    var traffic_mw = require("./../mw/traffic/index");
                    app.use(traffic_mw({}));

                    app.use(function (req, res, next) {
                        setImmediate(function () {
                            req.soajs.controller.gotoservice(req, res, null);
                        });

                        req.on("error", function (error) {
                            req.soajs.log.error("Error @ controller:", error);
                            if (req.soajs.controller.redirectedRequest) {
                                req.soajs.controller.redirectedRequest.abort();
                            }
                        });

                        req.on("close", function () {
                            if (req.soajs.controller.redirectedRequest) {
                                req.soajs.log.info("Request aborted:", req.url);
                                req.soajs.controller.redirectedRequest.abort();
                            }
                        });
                    });

                    app.use(utils.logErrors);
                    app.use(utils.controllerClientErrorHandler);
                    app.use(utils.controllerErrorHandler);

                    callback();
                }
                else {
                    _self.log.error('Unable to load provision. controller will not start :(');
                    callback();
                }
            });
        });
    }
};

/**
 *
 */
controller.prototype.start = function (cb) {
    var _self = this;
    var maintenancePort = _self.registry.services.controller.port + _self.registry.serviceConfig.ports.maintenanceInc;
    _self.server.on('error', function (err) {
        if (err.code === 'EADDRINUSE') {
            _self.log.error('Address [port: ' + _self.registry.services.controller.port + '] in use by another service, exiting');
        }
        else {
            _self.log.error(err);
        }
    });

    function getAwarenessInfo(terminate, cb) {
        var tmp = core.registry.get();
        if (tmp && (tmp.services || tmp.daemons)) {
            let awarenessStatData = {
                "ts": Date.now(),
                "data": soajsUtils.cloneObj({"services": tmp.services, "daemons": tmp.daemons})
            };

            if (terminate) {
                for (let serviceName in awarenessStatData.data.services) {
                    if (serviceName === 'controller') {
                        for (let serviceIP in awarenessStatData.data.services.controller.awarenessStats) {
                            if (serviceIP === _self.serviceIp) {
                                awarenessStatData.data.services.controller.awarenessStats[serviceIP].healthy = false;
                                awarenessStatData.data.services.controller.awarenessStats[serviceIP].lastCheck = Date.now();
                            }
                        }
                    }
                    else {
                        delete awarenessStatData.data.services[serviceName];
                    }
                }

                delete awarenessStatData.data.daemons;
            }
            core.registry.addUpdateEnvControllers({
                "ip": _self.serviceIp,
                "ts": awarenessStatData.ts,
                "data": awarenessStatData.data,
                "env": regEnvironment
            }, cb);
        }
    }

    _self.server.listen(_self.registry.services.controller.port, function (err) {
        if (err) {
            _self.log.error(err);
        }
        else {
            _self.log.info(_self.serviceName + " service started on port: " + _self.registry.services.controller.port);
            if (!process.env.SOAJS_DEPLOY_HA) {
                core.registry.registerHost({
                    "serviceName": _self.serviceName,
                    "serviceVersion": _self.serviceVersion,
                    "servicePort": _self.registry.services.controller.port,
                    "serviceIp": _self.serviceIp,
                    "serviceHATask": _self.serviceHATask
                }, _self.registry, function (registered) {
                    if (registered) {
                        _self.log.info("Host IP [" + _self.serviceIp + "] for service [" + _self.serviceName + "@" + _self.serviceVersion + "] successfully registered.");

                        //update the database with the awareness Response generated.
                        setTimeout(() => {
                            getAwarenessInfo(false, (error) => {
                                if (error) {
                                    _self.log.error(error);
                                }
                            });
                        }, _self.registry.serviceConfig.awareness.healthCheckInterval);

                        //update the database with the awareness Response generated.
                        //controller has been terminated.
                        process.on('SIGINT', function () {
                            getAwarenessInfo(true, (error) => {
                                if (error) {
                                    _self.log.error(error);
                                }
                                _self.log.warn("Service Terminated via interrupt signal.");
                                process.exit();
                            });
                        });
                    }
                    else
                        _self.log.warn("Unable to register host IP [" + _self.serviceIp + "] for service [" + _self.serviceName + "@" + _self.serviceVersion + "]");
                });
            }
        }
        if (cb) {
            cb(err);
        }
    });
    _self.serverMaintenance.on('error', function (err) {
        if (err.code === 'EADDRINUSE') {
            _self.log.error('Address [port: ' + (maintenancePort) + '] in use by another service, exiting');
        }
        else {
            _self.log.error(err);
        }
    });
    _self.serverMaintenance.listen(maintenancePort, function (err) {
        if (err) {
            _self.log.error(err);
        }
        else {
            _self.log.info(_self.serviceName + " service maintenance is listening on port: " + maintenancePort);
        }
    });
};


controller.prototype.stop = function (cb) {
    var _self = this;
    _self.log.info('stopping controllerServer on port:', _self.registry.services.controller.port);
    _self.server.close(function (err) {
        _self.serverMaintenance.close(function (err) {
            if (cb) {
                cb(err);
            }
        });
    });
};

module.exports = controller;