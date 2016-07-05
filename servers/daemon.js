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

function extractJOBsList(schema) {
    var jobList = {};
    for (var job in schema) {
        if (Object.hasOwnProperty.call(schema, job)) {
            var oneJob = {
                'l': schema[job].l
            };

            if (schema[job].group) {
                oneJob.group = schema[job].group;
            }

            if (schema[job].groupMain) {
                oneJob.groupMain = schema[job].groupMain;
            }
            jobList[job] = oneJob;
        }
    }
    return jobList;
}

/**
 *
 * @param param {}
 */
function daemon(param) {
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

    _self.soajs = {};
    _self.soajs.param = param;
    _self.daemonStats = {
        "step": "initialize",
        "jobs": {}
    };
    _self.daemonTimeout = null;
    _self.appMaintenance = express();
}

daemon.prototype.init = function (callback) {
    var _self = this;
    var registry = null;

    _self.soajs.param.serviceGroup = _self.soajs.param.serviceGroup || "No Group Daemon";
    _self.soajs.param.serviceVersion = _self.soajs.param.serviceVersion || 1;
    _self.soajs.param.serviceVersion = parseInt(_self.soajs.param.serviceVersion);
    if (isNaN(_self.soajs.param.serviceVersion)){
        throw new Error('Daemon Service version must be integer: ['+_self.soajs.param.serviceVersion+']');
    }
    _self.soajs.param.servicePort = _self.soajs.param.servicePort || null;
    _self.soajs.param.serviceIp = process.env.SOAJS_SRVIP || null;

    var fetchedHostIp = null;
    var serviceIpNotDetected = false;
    if (!autoRegHost) {
        _self.soajs.param.serviceIp = '127.0.0.1';
    }
    if (!_self.soajs.param.serviceIp) {
        fetchedHostIp = core.getHostIp();
        if (fetchedHostIp && fetchedHostIp.result) {
            _self.soajs.param.serviceIp = fetchedHostIp.ip;
        } else {
            serviceIpNotDetected = true;
            _self.soajs.param.serviceIp = "127.0.0.1";
        }
    }

    _self.soajs.jobList = extractJOBsList(_self.soajs.param.schema);

    core.registry.load({
        "type": "daemon",
        "serviceName": _self.soajs.param.serviceName,
        "serviceGroup": _self.soajs.param.serviceGroup,
        "serviceVersion": _self.soajs.param.serviceVersion,
        "designatedPort": _self.soajs.param.servicePort,
        "serviceIp": _self.soajs.param.serviceIp,
        "jobList": _self.soajs.jobList
    }, function (reg) {
        registry = reg;
        _self.soajs.daemonServiceConf = lib.registry.getDaemonServiceConf(_self.soajs.param.serviceName, registry);

        _self.soajs.log = core.getLogger(_self.soajs.param.serviceName, registry.serviceConfig.logger);
        if (_self.soajs.param.oldStyleConfiguration)
            _self.soajs.log.warn("Old style configuration detected. Please start using the new way of passing param when creating a new daemon service.");
        _self.soajs.log.info("Registry has been loaded successfully from environment: " + registry.environment);

        if (fetchedHostIp) {
            if (!fetchedHostIp.result) {
                _self.soajs.log.warn("Unable to find the daemon service host ip. The daemon service will NOT be registered for awareness.");
                _self.soajs.log.info("IPs found: ", fetchedHostIp.ips);
                if (serviceIpNotDetected) {
                    _self.soajs.log.warn("The default daemon service IP has been used [" + _self.soajs.param.serviceIp + "]");
                }
            }
            else {
                _self.soajs.log.info("The IP registered for daemon service [" + _self.soajs.param.serviceName + "] awareness : ", fetchedHostIp.ip);
            }
        }

        if (!_self.soajs.param.serviceName || !_self.soajs.daemonServiceConf) {
            if (!_self.soajs.param.serviceName) {
                _self.soajs.log.error('Daemon Service failed to start, serviceName is empty [' + _self.soajs.param.serviceName + ']');
            } else {
                _self.soajs.log.error('Daemon Service [' + _self.soajs.param.serviceName + '] failed to start. Unable to find the daemon service entry in registry');
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

        var registry = core.registry.get();
        _self.soajs.log.info("Loading Daemon Service Provision ...");
        provision.init(registry.coreDB.provision, _self.soajs.log);
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
                            'service': _self.soajs.param.serviceName.toUpperCase(),
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
                        "serviceName": _self.soajs.param.serviceName,
                        "serviceGroup": _self.soajs.param.serviceGroup,
                        "serviceVersion": _self.soajs.param.serviceVersion,
                        "designatedPort": _self.soajs.param.servicePort,
                        "serviceIp": _self.soajs.param.serviceIp
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
                    _self.soajs.log.info(_self.soajs.param.serviceName + " daemon service maintenance is listening on port: " + maintenancePort);
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
                    provision.loadDaemonGrpConf(process.env.SOAJS_DAEMON_GRP_CONF, _self.soajs.param.serviceName, function (err, daemonConf) {
                        if (daemonConf && daemonConf.status && daemonConf.jobs) {
                            _self.daemonStats.daemonConfigGroup = daemonConf.daemonConfigGroup;
                            _self.daemonStats.daemon = daemonConf.daemon;
                            _self.daemonStats.status = daemonConf.status;
                            _self.daemonStats.interval = daemonConf.interval;
                            _self.daemonStats.ts = new Date().getTime();
                            _self.daemonStats.step = "fetching";

                            var jobs_array = [];
                            var buildJob = function (jobInfoObj, _job) {
                                var jobObj = {};
                                if (jobInfoObj.type === "global") {
                                    jobObj = {
                                        "soajs": {
                                            "meta": core.meta,
                                            "servicesConfig": jobInfoObj.serviceConfig
                                        },
                                        "job": _job,
                                        "thread": "global"
                                    };
                                    jobs_array.push(jobObj);
                                }
                                else if (jobInfoObj.tenantExtKeys) { //type === "tenant"
                                    for (var tCount = 0; tCount < jobInfoObj.tenantExtKeys.length; tCount++) {
                                        jobObj = {
                                            "soajs": {
                                                "meta": core.meta
                                            },
                                            "job": _job
                                        };
                                        var tExtKey = jobInfoObj.tenantExtKeys[tCount];
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
                            };

                            if (daemonConf.daemonConfigGroup.processing && daemonConf.daemonConfigGroup.processing === "sequential") {
                                if (daemonConf.daemonConfigGroup.order && Array.isArray(daemonConf.daemonConfigGroup.order)) {
                                    for (var i = 0; i < daemonConf.daemonConfigGroup.order.length; i++) {
                                        if (daemonConf.jobs[daemonConf.daemonConfigGroup.order[i]])
                                            buildJob(daemonConf.jobs[daemonConf.daemonConfigGroup.order[i]], daemonConf.daemonConfigGroup.order[i]);
                                    }
                                }
                            }
                            else {
                                for (var job in daemonConf.jobs) {
                                    if ((Object.hasOwnProperty.call(daemonConf.jobs, job)) && struct_jobs[job]) {
                                        buildJob(daemonConf.jobs[job], job);
                                    }
                                }
                            }

                            if (jobs_array.length > 0) {
                                _self.daemonStats.step = "executing";

                                var asyncErrorFn = function (err) {
                                    if (err)
                                        _self.soajs.log.warn('Unable to complete daemon execution: ' + err);
                                    _self.daemonStats.step = "waiting";
                                    _self.daemonTimeout = setTimeout(executeDaemon, (daemonConf.interval || defaultInterval));
                                };
                                var asyncIteratorFn = function (jobThread, callback) {
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
                                };

                                if (daemonConf.daemonConfigGroup.processing && daemonConf.daemonConfigGroup.processing === "sequential") {
                                    async.eachSeries(jobs_array, asyncIteratorFn, asyncErrorFn);
                                }
                                else {
                                    async.each(jobs_array, asyncIteratorFn, asyncErrorFn);
                                }
                            }
                            else {
                                _self.soajs.log.info('Jobs stack is empty for daemon [' + daemonConf.daemon + '] and group [' + daemonConf.daemonConfigGroup + ']');
                                _self.daemonStats.step = "waiting";
                                _self.daemonTimeout = setTimeout(executeDaemon, (daemonConf.interval || defaultInterval));
                            }
                        }
                        else {
                            _self.daemonStats.step = "waiting";
                            _self.daemonTimeout = setTimeout(executeDaemon, (daemonConf ? daemonConf.interval : defaultInterval));
                        }
                    });
                };
                executeDaemon();
                resume();
            }
        });
    } else {
        return resume(new Error('Failed starting daemon service'));
    }
    var resume = function (err) {
        if (autoRegHost) {
            _self.soajs.log.info("Initiating service auto register for awareness ...");
            core.registry.autoRegisterService(_self.soajs.param.serviceName, _self.soajs.param.serviceIp, _self.soajs.param.serviceVersion, "daemons", function (err, registered) {
                if (err) {
                    _self.soajs.log.warn('Unable to trigger autoRegisterService awareness for controllers: ' + err);
                } else if (registered) {
                    _self.soajs.log.info('The autoRegisterService @ controllers for [' + _self.soajs.param.serviceName + '@' + _self.soajs.param.serviceIp + '] successfully finished.');
                }
            });
        }
        else {
            _self.soajs.log.info("Service auto register for awareness, skipped.");
        }
        if (cb && typeof cb === "function") {
            cb(err);
        } else if (err) {
            throw err;
        }
    };
};

daemon.prototype.stop = function (cb) {
    var _self = this;
    _self.soajs.log.info('stopping daemon service[' + _self.soajs.param.serviceName + '] on port:', _self.soajs.daemonServiceConf.info.port);
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