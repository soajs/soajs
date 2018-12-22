'use strict';

var path = require('path');
var async = require('async');

var coreModules = require ("soajs.core.modules");
var core = coreModules.core;
var provision = coreModules.provision;
var lib = require ("soajs.core.libs");

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

    _self.soajs.param.serviceName = _self.soajs.param.serviceName.toLowerCase();
    _self.soajs.param.serviceGroup = _self.soajs.param.serviceGroup || "No Group Daemon";
    _self.soajs.param.serviceVersion = "" + (_self.soajs.param.serviceVersion || 1);

    if (!lib.version.validate(_self.soajs.param.serviceVersion)){
        throw new Error('Daemon version must be of format [1.1] : [' + _self.soajs.param.serviceVersion + ']');
    }
    _self.soajs.param.servicePort = _self.soajs.param.servicePort || null;
    _self.soajs.param.serviceIp = process.env.SOAJS_SRVIP || null;
    _self.soajs.param.serviceHATask = null;


    //automatically add maintenance to service
    if (!_self.soajs.param.maintenance)
        _self.soajs.param.maintenance = {};
    _self.soajs.param.maintenance.port = {"type": "maintenance"};
    _self.soajs.param.maintenance.readiness = "/heartbeat";
    if (!_self.soajs.param.maintenance.commands)
        _self.soajs.param.maintenance.commands = [];
    _self.soajs.param.maintenance.commands.push ({"label":"Releoad Registry","path":"/reloadRegistry","icon":"registry"});
    _self.soajs.param.maintenance.commands.push ({"label":"Releoad Provision","path":"/loadProvision","icon":"provision"});
    _self.soajs.param.maintenance.commands.push ({"label":"Statistic","path":"/daemonStats","icon":"statistic"});
    _self.soajs.param.maintenance.commands.push ({"label":"Releoad Configuration","path":"/reloadDaemonConf","icon":"Configuration"});

    var fetchedHostIp = null;
    var serviceIpNotDetected = false;
    if (!autoRegHost && !process.env.SOAJS_DEPLOY_HA) {
        _self.soajs.param.serviceIp = '127.0.0.1';
    }
    if (!_self.soajs.param.serviceIp && !process.env.SOAJS_DEPLOY_HA) {
        core.getHostIp(function (err, getHostIpResponse) {
            fetchedHostIp = getHostIpResponse;
            if (fetchedHostIp && fetchedHostIp.result) {
                _self.soajs.param.serviceIp = fetchedHostIp.ip;
                if (fetchedHostIp.extra && fetchedHostIp.extra.swarmTask) {
                    _self.soajs.param.serviceHATask = fetchedHostIp.extra.swarmTask;
                }
            } else {
                serviceIpNotDetected = true;
                _self.soajs.param.serviceIp = "127.0.0.1";
            }
            resume();
        });
    }
    else {
        resume();
    }

    function resume() {
	    _self.soajs.jobList = extractJOBsList(_self.soajs.param.schema);
        core.registry.load({
            "type": "daemon",
            "serviceName": _self.soajs.param.serviceName,
            "serviceGroup": _self.soajs.param.serviceGroup,
            "serviceVersion": _self.soajs.param.serviceVersion,
            "designatedPort": _self.soajs.param.servicePort,
            "serviceIp": _self.soajs.param.serviceIp,
            "jobList": _self.soajs.jobList,
            "maintenance": _self.soajs.param.maintenance,
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
                    _self.soajs.log.info("IPs found: ", fetchedHostIp.extra.ips);
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
            // Registry now is loaded and all param are assured

            _self.soajs.log.info("Daemon Service middleware initialization started...");

            //This object will hold all the middleware needed by the daemon
            _self.soajs.mw = {};

            var favicon_mw = require("./../mw/favicon/index");
            _self.appMaintenance.use(favicon_mw());
            _self.soajs.log.info("Favicon middleware initialization done.");

            if (_self.soajs.param.awarenessEnv) {
                var awarenessEnv_mw = require("./../mw/awarenessEnv/index");
                _self.soajs.mw.awarenessEnv = (awarenessEnv_mw.getMw({
                    "awarenessEnv": _self.soajs.param.awarenessEnv,
                    "log": _self.soajs.log
                }));
                _self.soajs.log.info("AwarenessEnv middleware initialization done.");
            }
            else {
                _self.soajs.log.info("AwarenessEnv middleware initialization skipped.");
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
daemon.prototype.start = function (cb) {
    var _self = this;

    var resume = function (err) {
        if (cb && typeof cb === "function") {
            cb(err);
        } else if (err) {
            throw err;
        }
    };

    if (_self.soajs) {
        _self.soajs.log.info("Daemon Service about to start ...");

        var registry = core.registry.get();
        _self.soajs.log.info("Loading Daemon Service Provision ...");
        provision.init(registry.coreDB.provision, _self.soajs.log);
        provision.loadProvision(function (loaded) {
            if (loaded) {
                _self.soajs.log.info("Daemon Service provision loaded.");
                _self.soajs.log.info("Starting Daemon Service ...");

                if (!process.env.SOAJS_DEPLOY_HA) {
                    core.registry.registerHost({
                        "serviceName": _self.soajs.param.serviceName,
                        "serviceVersion": _self.soajs.param.serviceVersion,
                        "serviceIp": _self.soajs.param.serviceIp,
                        "serviceHATask": _self.soajs.param.serviceHATask
                    }, registry, function (registered) {
                        if (registered)
                            _self.soajs.log.info("Host IP [" + _self.soajs.param.serviceIp + "] for daemon service [" + _self.soajs.param.serviceName + "@" + _self.soajs.param.serviceVersion + "] successfully registered.");
                        else
                            _self.soajs.log.warn("Unable to register host IP [" + _self.soajs.param.serviceIp + "] for daemon service [" + _self.soajs.param.serviceName + "@" + _self.soajs.param.serviceVersion + "]");
                    });
                }

                //MAINTENANCE Service Routes
                _self.soajs.log.info("Adding Daemon Service Maintenance Routes ...");
	
	            //calculate the maintenance port value
                var maintenancePort = _self.soajs.daemonServiceConf.info.port + _self.soajs.daemonServiceConf._conf.ports.maintenanceInc;
	            if(!process.env.SOAJS_DEPLOY_HA){
		            if(process.env.SOAJS_SRVPORT){
			            let envPort = parseInt(process.env.SOAJS_SRVPORT);
			            if(isNaN(envPort)){
				            throw new Error("Invalid port value detected in SOAJS_SRVPORT environment variable, port value is not a number!");
			            }
			            maintenancePort = envPort + _self.soajs.daemonServiceConf._conf.ports.maintenanceInc;
		            }
		            else if(process.env.SOAJS_ENV && process.env.SOAJS_ENV.toUpperCase() !== 'DASHBOARD'){
			            maintenancePort += _self.soajs.daemonServiceConf._conf.ports.controller;
		            }
	            }
	            
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
                _self.appMaintenance.get("/reloadDaemonConf", function (req, res) {
                    var response = maintenanceResponse(req);
                    provision.loadDaemonGrpConf(process.env.SOAJS_DAEMON_GRP_CONF, _self.soajs.param.serviceName, function (err, daemonConf) {
                        if (daemonConf) {
                            _self.daemonConf = daemonConf;
                            setupDaemon();
                            response['result'] = true;
                        }
                        else {
                            response['result'] = false;
                            if (err)
                                _self.soajs.log.warn("Failed to load daemon config for [" + _self.soajs.param.serviceName + "@" + process.env.SOAJS_DAEMON_GRP_CONF + "]. reusing from previous load. Reason: " + err.message);
                        }
                        response['data'] = _self.daemonConf;
                        res.jsonp(response);
                    });
                });

                _self.appMaintenance.all('*', function (req, res) {
                    var response = maintenanceResponse(req, "heartbeat");
                    response['result'] = true;
                    res.jsonp(response);
                });
                _self.appMaintenance.httpServer = _self.appMaintenance.listen(maintenancePort, function (err) {
                    _self.soajs.log.info(_self.soajs.param.serviceName + " daemon service maintenance is listening on port: " + maintenancePort);
                });

                //We only want to log once the error message while executing th daemon so we do not jam the logging system
                var execErrorMsgMainOn = true;
                var execErrorMsgSubOn = true;

                var defaultInterval = 1800000; //30 minutes
                var daemonConf_tpl = {
                    "daemonConfigGroup": "group1", //group name
                    "daemon": "order", //daemon name
                    "status": 1, //1=on, 0=off
                    "processing": "sequential", //sequential, parallel
                    "order": [ //run the jobs in specific order
                        "hello"
                    ],
                    "solo": true,
                    "interval": 5000, //30 minutes
                    "type": "interval", //interval, cron
                    "cronConfig": {
                        "cronTime": '00 30 11 * * 1-5', //can also be a specific date. new Date()
                        "timeZone": 'America/Los_Angeles' //https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
                    },
                    "jobs": {
                        "hello": {
                            "type": "global", // "tenant" || "global"
                            "serviceConfig": {"mike": "testing"}, //if global
                            "tenantExtKeys": [] //if tenant
                        }
                    }
                };

                var setupDaemon = function () {
                    if (_self.daemonConf) {
                        if (_self.daemonStats.step === "executing") {
                            //wait then configure
                            _self.postExecutingFn = function () {
                                if (_self.daemonCronJob)
                                    _self.daemonCronJob.stop();
                                if (_self.daemonTimeout)
                                    clearTimeout(_self.daemonTimeout);
                                configureDaemon();
                            };
                        }
                        else if (_self.daemonStats.step === "waiting" || _self.daemonStats.step === "fetching") {
                            //stop any daemon scheduled task
                            if (_self.daemonCronJob)
                                _self.daemonCronJob.stop();
                            if (_self.daemonTimeout)
                                clearTimeout(_self.daemonTimeout);

                            configureDaemon();
                        }
                        else { //initialize
                            configureDaemon();
                        }
                    }
                    else {
                        _self.soajs.log.error('daemonConf is not valid for daemon [' + _self.soajs.param.serviceName + '] and group [' + process.env.SOAJS_DAEMON_GRP_CONF + ']');
                        _self.soajs.log.error('Daemon [' + _self.soajs.param.serviceName + '] failed to setup and will not start.');
                    }
                };

                var configureDaemon = function () {
                    _self.daemonConf.type = _self.daemonConf.type || "interval";
                    if (_self.daemonConf.type === "cron") {
                        if (_self.daemonConf.cronConfig) {
                            try {
                                var cronJob = require('cron').CronJob;
                                _self.daemonCronJob = new cronJob({
                                    "cronTime": _self.daemonConf.cronConfig.cronTime,
                                    "onTick": executeDaemon,
                                    "start": false,
                                    "timeZone": _self.daemonConf.cronConfig.timeZone || null
                                });
                                _self.daemonCronJob.start();
                            } catch (ex) {
                                _self.soajs.log.error('Cron configuration is not valid for daemon [' + _self.daemonConf.daemon + '] and group [' + _self.daemonConf.daemonConfigGroup + ']');
                                _self.soajs.log.error('Daemon [' + _self.daemonConf.daemon + '] failed to setup and will not start.');
                            }
                        }
                        else {
                            _self.soajs.log.error('Cron configuration is not valid for daemon [' + _self.daemonConf.daemon + '] and group [' + _self.daemonConf.daemonConfigGroup + ']');
                            _self.soajs.log.error('Daemon [' + _self.daemonConf.daemon + '] failed to setup and will not start.');
                        }
                    }
                    else { // it is interval
                        // Param assurance
                        if (_self.daemonConf.interval) {
                            _self.daemonConf.interval = parseInt(_self.daemonConf.interval);
                            if (isNaN(_self.daemonConf.interval)) {
                                _self.soajs.log.warn('Interval is not an integer for daemon [' + _self.daemonConf.daemon + '] and group [' + _self.daemonConf.daemonConfigGroup + '].');
                                _self.daemonConf.interval = defaultInterval;
                                _self.soajs.log.warn('The default interval [' + defaultInterval + '] will be used.');
                            }
                        }
                        else {
                            _self.daemonConf.interval = defaultInterval;
                            _self.soajs.log.warn('The default interval [' + defaultInterval + '] will be used.');
                        }
                        executeDaemon ();
                        //_self.daemonTimeout = setTimeout(executeDaemon, _self.daemonConf.interval);
                    }
                };

                var executeDaemon = function () {
                    _self.daemonStats.step = "waiting";
                    if (_self.daemonConf.status && _self.daemonConf.jobs) {
                        execErrorMsgMainOn = true;
                        //Set daemon stats object for stats maintenance route
                        _self.daemonStats.daemonConfigGroup = _self.daemonConf.daemonConfigGroup;
                        _self.daemonStats.daemon = _self.daemonConf.daemon;
                        _self.daemonStats.status = _self.daemonConf.status;
                        //_self.daemonStats.interval = _self.daemonConf.interval;
                        _self.daemonStats.ts = new Date().getTime();
                        _self.daemonStats.step = "fetching";

                        //build the jobs array
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
                        if (_self.daemonConf.processing && _self.daemonConf.processing === "sequential") {
                        	if (_self.daemonConf.order && Array.isArray(_self.daemonConf.order)) {
                                for (var i = 0; i < _self.daemonConf.order.length; i++) {
                                    if (_self.daemonConf.jobs[_self.daemonConf.order[i]])
                                        buildJob(_self.daemonConf.jobs[_self.daemonConf.order[i]], _self.daemonConf.order[i]);
                                }
                            }
                        }
                        else {
                            for (var job in _self.daemonConf.jobs) {
                                if ((Object.hasOwnProperty.call(_self.daemonConf.jobs, job)) && struct_jobs[job]) {
                                    buildJob(_self.daemonConf.jobs[job], job);
                                }
                            }
                        }

                        //execute the jobs array
                        if (jobs_array.length > 0) {
                            execErrorMsgSubOn = true;
                            _self.daemonStats.step = "executing";
                            var asyncEndFn = function (err) {
                                if (err)
                                    _self.soajs.log.warn('Unable to complete daemon execution: ' + err);
                                _self.daemonStats.step = "waiting";

                                if (_self.daemonConf.type === "interval")
                                    _self.daemonTimeout = setTimeout(executeDaemon, _self.daemonConf.interval);

                                if (_self.postExecutingFn && typeof  _self.postExecutingFn === "function") {
                                    _self.postExecutingFn();
                                    _self.postExecutingFn = null;
                                }
                            };
                            var asyncIteratorFn = function (jobThread, callback) {
                                var threadStartTs = new Date().getTime();

                                var afterMWLoaded = function (){
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

                                //Build soajs object to be passed to all the registered jobs
                                jobThread.soajs.registry = core.registry.get();
                                jobThread.soajs.log = _self.soajs.log;

                                //Execute awarenessEnv MW
                                if (_self.soajs.mw.awarenessEnv){
                                    _self.soajs.mw.awarenessEnv(jobThread, null, function (error){
                                        afterMWLoaded();
                                    })
                                }
                                else {
                                    afterMWLoaded();
                                }
                            };

                            if (_self.daemonConf.processing && _self.daemonConf.processing === "sequential")
                                async.eachSeries(jobs_array, asyncIteratorFn, asyncEndFn);
                            else
                                async.each(jobs_array, asyncIteratorFn, asyncEndFn);
                        }
                        else {
                            _self.daemonStats.step = "waiting";
                            if (execErrorMsgSubOn)
                                _self.soajs.log.info('Jobs stack is empty for daemon [' + _self.daemonConf.daemon + '] and group [' + _self.daemonConf.daemonConfigGroup + ']');
                            execErrorMsgSubOn = false;
                            if (_self.daemonConf.type === "interval")
                                _self.daemonTimeout = setTimeout(executeDaemon, _self.daemonConf.interval);
                        }
                    }
                    else {
                        _self.daemonStats.step = "waiting";
                        if (execErrorMsgMainOn) {
                            execErrorMsgMainOn = false;
                            if (!_self.daemonConf.status)
                                _self.soajs.log.info('Daemon is OFF for daemon [' + _self.daemonConf.daemon + '] and group [' + _self.daemonConf.daemonConfigGroup + ']');
                            if (!_self.daemonConf.jobs)
                                _self.soajs.log.info('Jobs stack is empty for daemon [' + _self.daemonConf.daemon + '] and group [' + _self.daemonConf.daemonConfigGroup + ']');
                        }
                        if (_self.daemonConf.type === "interval")
                            _self.daemonTimeout = setTimeout(executeDaemon, _self.daemonConf.interval);
                    }
                };
                if (!process.env.SOAJS_DAEMON_GRP_CONF){
                    _self.soajs.log.error('Environment variable [SOAJS_DAEMON_GRP_CONF] for daemon [' + _self.soajs.param.serviceName + '] is not set.');
                }
                else {
                    provision.loadDaemonGrpConf(process.env.SOAJS_DAEMON_GRP_CONF, _self.soajs.param.serviceName, function (err, daemonConf) {
                        _self.daemonConf = daemonConf;
                        setupDaemon();
                    });
                }
            }
            if (autoRegHost && !process.env.SOAJS_DEPLOY_HA) {
                _self.soajs.log.info("Initiating service auto register for awareness ...");
                core.registry.autoRegisterService({
                    "name": _self.soajs.param.serviceName,
                    "serviceIp": _self.soajs.param.serviceIp,
                    "serviceVersion": _self.soajs.param.serviceVersion,
                    "serviceHATask": _self.soajs.param.serviceHATask,
                    "what": "daemons"
                }, function (err, registered) {
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
            return resume();
        });
    } else {
        return resume(new Error('Failed starting daemon service'));
    }
};

daemon.prototype.stop = function (cb) {
    var _self = this;
    _self.soajs.log.info('stopping daemon service[' + _self.soajs.param.serviceName + '] on port:', _self.soajs.daemonServiceConf.info.port);
    if (_self.daemonTimeout)
        clearTimeout(_self.daemonTimeout);
    if (_self.daemonCronJob)
        _self.daemonCronJob.stop();
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