'use strict';

var path = require('path');

var provision = require("./../modules/soajs.provision/index.js");
var core = require("./../modules/soajs.core/index.js");

var lib = require("./../lib/index");

var express = require("./../classes/express");

var autoRegHost = process.env.SOAJS_SRV_AUTOREGISTERHOST || true;
if (autoRegHost && typeof(autoRegHost) !== 'boolean') {
    autoRegHost = (autoRegHost === 'true');
}

//TODO: create getDaemonServiceConf at lib registry
//TODO: fix registry load and reload to support type daemon


/*
 * param = {
 *           config : object
 *         }
 */
/**
 *
 * @param param
 */
function daemon(param) {
    var _self = this;
    _self.soajs = {};
    _self.soajs.param = param;

    _self.appMaintenance = express();
}

daemon.prototype.init = function (callback) {
    var _self = this;
    var registry = null;
    _self.soajs.daemonServiceName = _self.param.daemonServiceName || _self.param.config.daemonServiceName;
    _self.soajs.daemonServiceIp = process.env.SOAJS_SRVIP || null;

    var fetchedHostIp = null;
    var serviceIpNotDetected = false;
    if (!autoRegHost) {
        _self.soajs.daemonServiceIp = '127.0.0.1';
    }
    if (!_self.soajs.daemonServiceIp) {
        fetchedHostIp = core.getHostIp();
        if (fetchedHostIp && fetchedHostIp.result) {
            _self.soajs.daemonServiceIp = fetchedHostIp.ip;
        } else {
            serviceIpNotDetected = true;
            _self.soajs.daemonServiceIp = "127.0.0.1";
        }
    }

    core.registry.load({
        "type": "daemon",
        "daemonServiceName": _self.soajs.daemonServiceName,
        "designatedPort": _self.param.config.daemonServicePort || null,
        "daemonServiceIp": _self.soajs.daemonServiceIp
    }, function (reg) {
        registry = reg;
        _self.soajs.daemonServiceConf = lib.registry.getDaemonServiceConf(_self.soajs.daemonServiceName, registry);
        _self.soajs.provision = registry.coreDB.provision;

        _self.soajs.log = core.getLogger(_self.soajs.daemonServiceName, registry.serviceConfig.logger);
        _self.soajs.log.info("Registry has been loaded successfully from environment: " + registry.environment);

        if (fetchedHostIp) {
            if (!fetchedHostIp.result) {
                _self.soajs.log.warn("Unable to find the daemon service host ip. The daemon service will NOT be registered for awareness.");
                _self.soajs.log.info("IPs found: ", fetchedHostIp.ips);
                if (serviceIpNotDetected) {
                    _self.soajs.log.warn("The default daemon service IP has been used [" + _self.soajs.daemonServiceIp + "]");
                }
            }
            else {
                _self.soajs.log.info("The IP registered for daemon service [" + _self.soajs.daemonServiceName + "] awareness : ", fetchedHostIp.ip);
            }
        }

        if (!_self.soajs.daemonServiceName || !_self.soajs.daemonServiceConf) {
            if (!_self.soajs.daemonServiceName) {
                _self.soajs.log.error('Daemon Service failed to start, daemonServiceName is empty [' + _self.soajs.daemonServiceName + ']');
            } else {
                _self.soajs.log.error('Daemon Service [' + _self.soajs.daemonServiceName + '] failed to start. Unable to find the daemon service entry in registry');
            }
            return callback(new Error("Daemon Service shutdown due to failure!"));
        }

        _self.soajs.log.info("Daemon Service middleware initialization started...");

        var favicon_mw = require("./../mw/favicon/index");
        //_self.app.use(favicon_mw());
        _self.appMaintenance.use(favicon_mw());
        _self.soajs.log.info("Favicon middleware initialization done.");

        callback();
    });
};

/**
 *
 */
daemon.prototype.start = function (cb) {
    var _self = this;
    if (_self.soajs) {
        _self.soajs.log.info("Daemon Service about to start ...");

        _self.soajs.log.info("Loading Daemon Service Provision ...");
        provision.init(_self.soajs.provision, _self.soajs.log);
        provision.loadProvision(function (loaded) {
            if (loaded) {
                _self.soajs.log.info("Daemon Service provision loaded.");
                _self.soajs.log.info("Starting Daemon Service ...");

                //MAINTENANCE Service Routes
                _self.soajs.log.info("Adding Daemon Service Maintenance Routes ...");
                var maintenancePort = _self.soajs.daemonServiceConf.info.port + _self.soajs.daemonServiceConf._conf.ports.maintenanceInc;
                var maintenanceResponse = function (req, route) {
                    var response = {
                        'result': false,
                        'ts': Date.now(),
                        'service': {
                            'service': _self.soajs.daemonServiceName.toUpperCase(),
                            'type': 'daemon',
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
                        "type": "daemon",
                        "daemonServiceName": _self.soajs.daemonServiceName,
                        "daemonServiceIp": _self.soajs.daemonServiceIp
                    }, function (err, reg) {
                        if (err) {
                            _self.soajs.log.warn("Failed to load registry. reusing from previous load. Reason: " + err.message);
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
                _self.appMaintenance.all('*', function (req, res) {
                    var response = maintenanceResponse(req, "heartbeat");
                    response['result'] = true;
                    res.jsonp(response);
                });
                _self.appMaintenance.httpServer = _self.appMaintenance.listen(maintenancePort, function (err) {
                    _self.soajs.log.info(_self.soajs.daemonServiceName + " daemon service maintenance is listening on port: " + maintenancePort);
                });
            }
        });
    } else {
        if (cb && typeof cb === "function") {
            cb(new Error('Failed starting daemon service'));
        } else {
            throw new Error('Failed starting daemon service');
        }
    }
};

daemon.prototype.stop = function (cb) {
    var _self = this;
    _self.soajs.log.info('stopping daemon service[' + _self.soajs.daemonServiceName + '] on port:', _self.soajs.daemonServiceConf.info.port);
    _self.appMaintenance.httpServer.close(function (err) {
        if (cb) {
            cb(err);
        }
    });
};

module.exports = daemon;