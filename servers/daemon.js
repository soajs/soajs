'use strict';

var path = require('path');
var async = require('async');

var provision = require("./../modules/soajs.provision/index.js");
var core = require("./../modules/soajs.core/index.js");

var lib = require("./../lib/index");

var express = require("./../classes/express");

var struct_jobs = {};

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
    _self.daemonStats = {
        "jobs": {}
    };
    _self.daemonTimeout = null;
    _self.appMaintenance = express();
}

daemon.prototype.init = function (callback) {
    var _self = this;
    var registry = null;
    _self.soajs.serviceName = _self.soajs.param.serviceName || _self.soajs.param.config.serviceName;
    _self.soajs.serviceIp = process.env.SOAJS_SRVIP || null;

    var fetchedHostIp = null;
    var serviceIpNotDetected = false;
    if (!autoRegHost) {
        _self.soajs.serviceIp = '127.0.0.1';
    }
    if (!_self.soajs.serviceIp) {
        fetchedHostIp = core.getHostIp();
        if (fetchedHostIp && fetchedHostIp.result) {
            _self.soajs.serviceIp = fetchedHostIp.ip;
        } else {
            serviceIpNotDetected = true;
            _self.soajs.serviceIp = "127.0.0.1";
        }
    }

    core.registry.load({
        "type": "daemon",
        "serviceName": _self.soajs.serviceName,
        "designatedPort": _self.soajs.param.config.servicePort || null,
        "serviceIp": _self.soajs.serviceIp,
        "jobList": {}
    }, function (reg) {
        registry = reg;
        _self.soajs.daemonServiceConf = lib.registry.getDaemonServiceConf(_self.soajs.serviceName, registry);
        _self.soajs.provision = registry.coreDB.provision;

        _self.soajs.log = core.getLogger(_self.soajs.serviceName, registry.serviceConfig.logger);
        _self.soajs.log.info("Registry has been loaded successfully from environment: " + registry.environment);

        if (fetchedHostIp) {
            if (!fetchedHostIp.result) {
                _self.soajs.log.warn("Unable to find the daemon service host ip. The daemon service will NOT be registered for awareness.");
                _self.soajs.log.info("IPs found: ", fetchedHostIp.ips);
                if (serviceIpNotDetected) {
                    _self.soajs.log.warn("The default daemon service IP has been used [" + _self.soajs.serviceIp + "]");
                }
            }
            else {
                _self.soajs.log.info("The IP registered for daemon service [" + _self.soajs.serviceName + "] awareness : ", fetchedHostIp.ip);
            }
        }

        if (!_self.soajs.serviceName || !_self.soajs.daemonServiceConf) {
            if (!_self.soajs.serviceName) {
                _self.soajs.log.error('Daemon Service failed to start, serviceName is empty [' + _self.soajs.serviceName + ']');
            } else {
                _self.soajs.log.error('Daemon Service [' + _self.soajs.serviceName + '] failed to start. Unable to find the daemon service entry in registry');
            }
            return callback(new Error("Daemon Service shutdown due to failure!"));
        }

        _self.soajs.log.info("Daemon Service middleware initialization started...");

        var favicon_mw = require("./../mw/favicon/index");
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
                            'service': _self.soajs.serviceName.toUpperCase(),
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
                        "serviceName": _self.soajs.serviceName,
                        "serviceIp": _self.soajs.serviceIp,
                        "jobList": {}
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
                _self.appMaintenance.get("/daemonStats", function (req, res) {
                    var response = maintenanceResponse(req);
                    response['result'] = true;
                    response['data'] = _self.daemonStats;
                    res.jsonp(response);
                });
                _self.appMaintenance.all('*', function (req, res) {
                    var response = maintenanceResponse(req, "heartbeat");
                    response['result'] = true;
                    res.jsonp(response);
                });
                _self.appMaintenance.httpServer = _self.appMaintenance.listen(maintenancePort, function (err) {
                    _self.soajs.log.info(_self.soajs.serviceName + " daemon service maintenance is listening on port: " + maintenancePort);
                });

                var defaultInterval = 1800000; //30 minutes
                var daemonConf_tpl = {
                    "daemonConfigGroup": "group1",
                    "daemon": "order",
                    "status": 1,
                    "interval": 5000, //30 minutes
                    "jobs": {
                        "hello": {
                            "type": "global", // "tenant" || "global"
                            "serviceConfig": {"mike": "tormoss"}, //if global
                            "tenantExtKeys": [] //if tenant
                        }
                    }
                };

                var executeDaemon = function () {
                    provision.loadDaemonGrpConf(process.env.SOAJS_DAEMON_GRP_CONF, _self.soajs.serviceName, function (err, daemonConf) {
                        if (daemonConf && daemonConf.status && daemonConf.jobs) {
                            _self.daemonStats.daemonConfigGroup = daemonConf.daemonConfigGroup;
                            _self.daemonStats.daemon = daemonConf.daemon;
                            _self.daemonStats.status = daemonConf.status;
                            _self.daemonStats.interval = daemonConf.interval;
                            _self.daemonStats.ts = new Date().getTime();
                            var jobs_array = [];
                            for (var job in daemonConf.jobs) {
                                if ((Object.hasOwnProperty.call(daemonConf.jobs, job)) && struct_jobs[job]) {
                                    if (daemonConf.jobs[job].type === "global") {
                                        var jobObj = {
                                            "soajs": {
                                                "servicesConfig": daemonConf.jobs[job].serviceConfig
                                            },
                                            "job": job,
                                            "thread": "global"
                                        };
                                        jobs_array.push(jobObj);
                                    }
                                    else if (daemonConf.jobs[job].tenantExtKeys) { //type === "tenant"
                                        for (var tCount = 0; tCount < daemonConf.jobs[job].tenantExtKeys.length; tCount++) {
                                            var jobObj = {
                                                "soajs": {},
                                                "job": job
                                            };
                                            var tExtKey = daemonConf.jobs[job].tenantExtKeys[tCount];
                                            jobObj.thread = tExtKey;
                                            provision.getExternalKeyData(tExtKey, _self.soajs.daemonServiceConf._conf.key, function (err, keyObj) {
                                                if (keyObj && keyObj.application && keyObj.application.package) {
                                                    provision.getPackageData(keyObj.application.package, function (err, packObj) {
                                                        if (packObj) {
                                                            jobObj.soajs.tenant = keyObj.tenant;
                                                            jobObj.soajs.tenant.key = {
                                                                "iKey": keyObj.key,
                                                                "eKey": keyObj.extKey
                                                            };
                                                            jobObj.soajs.tenant.application = keyObj.application;
                                                            jobObj.soajs.tenant.application.package_acl = packObj.acl;
                                                            jobObj.soajs.servicesConfig = keyObj.config;
                                                            jobs_array.push(jobObj);
                                                        }
                                                    });
                                                }
                                            });
                                        }
                                    }
                                }
                            }
                            if (jobs_array.length > 0) {
                                async.each(jobs_array,
                                    function (jobThread, callback) {
                                        var threadStartTs = new Date().getTime();
                                        jobThread.soajs.registry = core.registry.get();
                                        jobThread.soajs.log = _self.soajs.log;
                                        struct_jobs[jobThread.job](jobThread.soajs, function (err) {
                                            if (err) {
                                                callback(err);
                                            }
                                            else {
                                                var threadEndTs = new Date().getTime();
                                                if (!_self.daemonStats.jobs[job])
                                                    _self.daemonStats.jobs[job] = {};
                                                _self.daemonStats.jobs[job].ts = threadStartTs;
                                                if (_self.daemonStats.jobs[job].fastest) {
                                                    if (_self.daemonStats.jobs[job].fastest > (threadEndTs - threadStartTs))
                                                        _self.daemonStats.jobs[job].fastest = threadEndTs - threadStartTs;
                                                }
                                                else
                                                    _self.daemonStats.jobs[job].fastest = threadEndTs - threadStartTs;
                                                if (_self.daemonStats.jobs[job].slowest) {
                                                    if (_self.daemonStats.jobs[job].slowest < (threadEndTs - threadStartTs))
                                                        _self.daemonStats.jobs[job].slowest = threadEndTs - threadStartTs;
                                                }
                                                else
                                                    _self.daemonStats.jobs[job].slowest = threadEndTs - threadStartTs;

                                                callback();
                                            }
                                        });
                                    }, function (err) {
                                        if (err)
                                            _self.soajs.log.warn('Unable to complete daemon execution: ' + err);
                                        _self.daemonTimeout = setTimeout(executeDaemon, (daemonConf.interval || defaultInterval)); //30 minutes default if not set
                                    }
                                );
                            }
                            else
                                _self.soajs.log.info('Jobs stack is empty for daemon [' + daemonConf.daemon + '] and group [' + daemonConf.daemonConfigGroup + ']');
                            _self.daemonTimeout = setTimeout(executeDaemon, (daemonConf.interval || defaultInterval));
                        }
                        else
                            _self.daemonTimeout = setTimeout(executeDaemon, (daemonConf ? daemonConf.interval : defaultInterval));
                    });
                };
                executeDaemon();
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
    _self.soajs.log.info('stopping daemon service[' + _self.soajs.serviceName + '] on port:', _self.soajs.daemonServiceConf.info.port);
    if (_self.daemonTimeout)
        clearTimeout(_self.daemonTimeout);
    _self.appMaintenance.httpServer.close(function (err) {
        if (cb) {
            cb(err);
        }
    });
};

/**
 *
 */
daemon.prototype.job = function (jobName, cb) {
    var _self = this;
    if (struct_jobs[jobName])
        _self.soajs.log.warn("Job [" + jobName + "] already exist, overwriting its callback");
    if (cb && typeof cb === "function")
        struct_jobs[jobName] = cb;
    else
        _self.soajs.log.warn("Failed to registry job [" + jobName + "]. the second argument of daemon.job must be a function.");
};

module.exports = daemon;