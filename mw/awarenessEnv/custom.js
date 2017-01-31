'use strict';

var request = require('request');
var async = require('async');
var core = require('../../modules/soajs.core');

var regEnvironment = (process.env.SOAJS_ENV || "dev");
regEnvironment = regEnvironment.toLowerCase();

var serviceAwarenessObj = {};
var controllerHosts = null;
var timeLoaded = 0;
var registry = core.registry.get();
var param = null;

var fetchControllerHosts = function (next) {
    registry = core.registry.get();
    core.registry.loadOtherEnvControllerHosts(function (error, hosts) {
        if (error)
            param.log.warn("Failed to load controller hosts. reusing from previous load. Reason: " + error.message);
        else {
            controllerHosts = hosts;
            controllerHosts.forEach(function (oneHost) {
                oneHost.name = "controller";
            });
        }
        param.log.info("Self Awareness ENV reloaded controller hosts. next reload is in [" + registry.serviceConfig.awareness.autoRelaodRegistry + "] milliseconds");
        setTimeout(fetchControllerHosts, registry.serviceConfig.awareness.autoRelaodRegistry);

        if (next && typeof next === "function")
            next();
    });
};

var awareness_healthCheck = function () {
    registry = core.registry.get();

    var resume = function () {
        if (controllerHosts && Array.isArray(controllerHosts) && controllerHosts.length > 0) {
            var controllerPort = registry.services.controller.port;
            async.each(controllerHosts,
                function (sObj, callback) {
                    if (!serviceAwarenessObj[sObj.env])
                        serviceAwarenessObj[sObj.env] = {};
                    if (!serviceAwarenessObj[sObj.env][sObj.name])
                        serviceAwarenessObj[sObj.env][sObj.name] = {"healthy": {}, "indexes": {}, "latest": 1};
                    if (!serviceAwarenessObj[sObj.env][sObj.name].healthy[sObj.version])
                        serviceAwarenessObj[sObj.env][sObj.name].healthy[sObj.version] = [];
                    if (!serviceAwarenessObj[sObj.env][sObj.name].indexes[sObj.version])
                        serviceAwarenessObj[sObj.env][sObj.name].indexes[sObj.version] = 0;
                    request({
                        'uri': 'http://' + sObj.ip + ':' + (controllerPort + registry.serviceConfig.ports.maintenanceInc) + '/heartbeat'
                    }, function (error, response, body) {
                        if (serviceAwarenessObj[sObj.env][sObj.name].latest < sObj.version)
                            serviceAwarenessObj[sObj.env][sObj.name].latest = sObj.version;
                        if (!error && response.statusCode === 200) {
                            if (serviceAwarenessObj[sObj.env][sObj.name].healthy[sObj.version].indexOf(sObj.ip) === -1)
                                serviceAwarenessObj[sObj.env][sObj.name].healthy[sObj.version].push(sObj.ip);
                        }
                        else {
                            if (serviceAwarenessObj[sObj.env][sObj.name].healthy[sObj.version].indexOf(sObj.ip) !== -1) {
                                //TODO: if we guarantee uniqueness we will not need the for loop
                                for (var ii = 0; ii < serviceAwarenessObj[sObj.env][sObj.name].healthy[sObj.version].length; ii++) {
                                    if (serviceAwarenessObj[sObj.env][sObj.name].healthy[sObj.version][ii] === sObj.ip)
                                        serviceAwarenessObj[sObj.env][sObj.name].healthy[sObj.version].splice(ii, 1);
                                }
                            }
                        }
                        callback();
                    });
                }, function (err) {
                    if (err)
                        param.log.warn('Unable to build awareness ENV structure for controllers: ' + err);
                });
        }
        setTimeout(awareness_healthCheck, registry.serviceConfig.awareness.healthCheckInterval);
    };

    if (timeLoaded !== registry.timeLoaded)
        fetchControllerHosts(resume);
    else
        resume();

    timeLoaded = registry.timeLoaded;
};


function roundRobin (s, v, env, cb) {
    if (!cb && typeof env === "function") {
        cb = env;
        env = regEnvironment;
    }
    else if (!cb && typeof v === "function") {
        cb = v;
        v = null;
    }
    else if (!cb && typeof s === "function") {
        cb = s;
        s = "controller";
    }


    if (env, s && serviceAwarenessObj[env] && serviceAwarenessObj[env][s] && serviceAwarenessObj[env][s].healthy) {
        if (!v)
            v = serviceAwarenessObj[env][s].latest;
        if (serviceAwarenessObj[env][s].healthy[v] && serviceAwarenessObj[env][s].healthy[v].length > 0) {
            if (!serviceAwarenessObj[env][s].indexes)
                serviceAwarenessObj[env][s].indexes = {};
            if (!serviceAwarenessObj[env][s].indexes[v] || serviceAwarenessObj[env][s].indexes[v] >= serviceAwarenessObj[env][s].healthy[v].length)
                serviceAwarenessObj[env][s].indexes[v] = 0;
            var host = serviceAwarenessObj[env][s].healthy[v][serviceAwarenessObj[env][s].indexes[v]];
            serviceAwarenessObj[env][s].indexes[v] += 1;
            return cb(host);
        }
        else
            return cb(null);
    }
    else
        return cb(null);
};

function init (_param) {
    param = _param;

    if (registry.serviceConfig.awareness.autoRelaodRegistry)
        setTimeout(fetchControllerHosts, registry.serviceConfig.awareness.autoRelaodRegistry);
    if (registry.serviceConfig.awareness.healthCheckInterval)
        awareness_healthCheck();
}

module.exports = {
    "init" : init,
    "getControllerEnvHost" : roundRobin
};