'use strict';

var request = require('request');
var async = require('async');

var core = require('../../modules/soajs.core');
/**
 *
 * @param param
 * @returns {Function}
 */
module.exports = function (param) {
    if (param.awareness) {
        var serviceAwarenessObj = {};
        var registry = core.registry.get();
        var awarenessHosts = {
            "registryLoadedTime": 0,
            "servicesArr": []
        };

        var awareness_reloadRegistry = function () {
            registry = core.registry.get();
            core.registry.reload({
                "serviceName": param.serviceName,
                "serviceGroup": param.serviceGroup,
                "serviceVersion": param.serviceVersion,
                "designatedPort": param.designatedPort,
                "extKeyRequired": param.extKeyRequired,
                "requestTimeout": param.requestTimeout,
                "requestTimeoutRenewal": param.requestTimeoutRenewal,
                "awareness": param.awareness,
                "serviceIp": param.serviceIp
            }, function (err, reg) {
                if (err)
                    param.log.warn("Failed to load registry. reusing from previous load. Reason: " + err.message);
                param.log.info("Self Awareness reloaded registry. next reload is in [" + registry.serviceConfig.awareness.autoRelaodRegistry + "] milliseconds");
                setTimeout(awareness_reloadRegistry, registry.serviceConfig.awareness.autoRelaodRegistry);
            });
        };
        var awareness_healthCheck = function () {
            registry = core.registry.get();
            if (awarenessHosts.registryLoadedTime !== registry.timeLoaded) {
                awarenessHosts = {
                    "registryLoadedTime": registry.timeLoaded,
                    "servicesArr": []
                };
                for (var s in registry.services) {
                    if (Object.hasOwnProperty.call(registry.services, s) && s !== param.serviceName) {
                        if (!serviceAwarenessObj[s])
                            serviceAwarenessObj[s] = {"healthy": {}, "indexes": {}};
                        if (!serviceAwarenessObj[s].healthy)
                            serviceAwarenessObj[s].healthy = {};
                        if (registry.services[s].hosts) {//} && registry.services[s].hosts.length > 0) {
                            for (var h_ver in registry.services[s].hosts) {
                                if (Object.hasOwnProperty.call(registry.services[s].hosts, h_ver) && h_ver !== "latest") {
                                    if (!serviceAwarenessObj[s].healthy[h_ver])
                                        serviceAwarenessObj[s].healthy[h_ver] = [];
                                    if (!serviceAwarenessObj[s].indexes[h_ver])
                                        serviceAwarenessObj[s].indexes[h_ver] = 0;
                                    if (registry.services[s].hosts[h_ver].length > 0) {
                                        for (var i = 0; i < registry.services[s].hosts[h_ver].length; i++) {
                                            var sObj = {
                                                "name": s,
                                                "group": registry.services[s].group,
                                                "port": registry.services[s].port,
                                                "host": registry.services[s].hosts[h_ver][i],
                                                "what": "services",
                                                "version": h_ver
                                            };
                                            awarenessHosts.servicesArr.push(sObj);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                for (var s in registry.daemons) {
                    if (Object.hasOwnProperty.call(registry.daemons, s) && s !== param.serviceName) {
                        if (!serviceAwarenessObj[s])
                            serviceAwarenessObj[s] = {"healthy": {}, "indexes": {}};
                        if (!serviceAwarenessObj[s].healthy)
                            serviceAwarenessObj[s].healthy = {};
                        if (registry.daemons[s].hosts){//} && registry.daemons[s].hosts.length > 0) {
                            for (var h_ver in registry.daemons[s].hosts) {
                                if (Object.hasOwnProperty.call(registry.daemons[s].hosts, h_ver) && h_ver !== "latest") {
                                    if (!serviceAwarenessObj[s].healthy[h_ver])
                                        serviceAwarenessObj[s].healthy[h_ver] = [];
                                    if (!serviceAwarenessObj[s].indexes[h_ver])
                                        serviceAwarenessObj[s].indexes[h_ver] = 0;
                                    if (registry.daemons[s].hosts[h_ver].length > 0) {
                                        for (var i = 0; i < registry.daemons[s].hosts[h_ver].length; i++) {
                                            var sObj = {
                                                "name": s,
                                                "port": registry.daemons[s].port,
                                                "group": registry.daemons[s].group,
                                                "host": registry.daemons[s].hosts[h_ver][i],
                                                "what": "daemons",
                                                "version": h_ver
                                            };
                                            awarenessHosts.servicesArr.push(sObj);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            async.each(awarenessHosts.servicesArr,
                function (sObj, callback) {
                    request({
                        'uri': 'http://' + sObj.host + ':' + (sObj.port + registry.serviceConfig.ports.maintenanceInc) + '/heartbeat'
                    }, function (error, response, body) {
                        if (!registry[sObj.what][sObj.name].awarenessStats)
                            registry[sObj.what][sObj.name].awarenessStats = {};
                        var statusObj = {"lastCheck": new Date().getTime(), "healthy": false, "version": sObj.version};
                        if (!error && response.statusCode === 200) {
                            statusObj.healthy = true;
                            if (serviceAwarenessObj[sObj.name].healthy[sObj.version].indexOf(sObj.host) === -1)
                                serviceAwarenessObj[sObj.name].healthy[sObj.version].push(sObj.host);
                        }
                        else {
                            if (registry[sObj.what][sObj.name].awarenessStats[sObj.host] && registry[sObj.what][sObj.name].awarenessStats[sObj.host].healthy === false) {
                                statusObj.downCount = registry[sObj.what][sObj.name].awarenessStats[sObj.host].downCount + 1;
                                statusObj.downSince = registry[sObj.what][sObj.name].awarenessStats[sObj.host].downSince;
                            }
                            else {
                                statusObj.downSince = statusObj.lastCheck;
                                statusObj.downCount = 0;
                            }

                            var stopLoggingAfter = registry.serviceConfig.awareness.maxLogCount;
                            if (statusObj.downCount <= stopLoggingAfter)
                                param.log.warn("Self Awareness health check for service [" + sObj.name + "] for host [" + sObj.host + "] is NOT healthy");
                            if (serviceAwarenessObj[sObj.name].healthy[sObj.version].indexOf(sObj.host) !== -1) {
                                //TODO: if we guarantee uniqueness we will not need the for loop
                                for (var ii = 0; ii < serviceAwarenessObj[sObj.name].healthy[sObj.version].length; ii++) {
                                    if (serviceAwarenessObj[sObj.name].healthy[sObj.version][ii] === sObj.host)
                                        serviceAwarenessObj[sObj.name].healthy[sObj.version].splice(ii, 1);
                                }
                            }
                        }
                        registry[sObj.what][sObj.name].awarenessStats[sObj.host] = statusObj;
                        callback();
                    });
                }, function (err) {
                    if (err)
                        param.log.warn('Unable to build awareness structure for services: ' + err);
                });
            setTimeout(awareness_healthCheck, registry.serviceConfig.awareness.healthCheckInterval);
        };

        var roundRobin = function (s, v, cb) {
            if (!cb && typeof v === "function") {
                cb = v;
                v = null;
            }

            if (s && registry.services[s] && registry.services[s].hosts && registry.services[s].hosts.latest && serviceAwarenessObj[s] && serviceAwarenessObj[s].healthy) {
                if (!v)
                    v = registry.services[s].hosts.latest;
                if (registry.services[s].hosts[v] && serviceAwarenessObj[s].healthy[v]) {
                    if (serviceAwarenessObj[s].healthy[v] && serviceAwarenessObj[s].healthy[v].length > 0) {
                        if (!serviceAwarenessObj[s].indexes)
                            serviceAwarenessObj[s].indexes = {};
                        if (!serviceAwarenessObj[s].indexes[v] || serviceAwarenessObj[s].indexes[v] >= registry.services[s].hosts[v].length)
                            serviceAwarenessObj[s].indexes[v] = 0;
                        var host = registry.services[s].hosts[v][serviceAwarenessObj[s].indexes[v]];
                        if (serviceAwarenessObj[s].healthy[v].indexOf(host) !== -1) {
                            serviceAwarenessObj[s].indexes[v] += 1;
                            return cb(host);
                        }
                        else {
                            serviceAwarenessObj[s].indexes[v] += 1;
                            return roundRobin(s, v, cb);
                        }
                    }
                }
                else
                    return cb(null);
            }
            else
                return cb(null);
        };

        if (registry.serviceConfig.awareness.healthCheckInterval)
            awareness_healthCheck();
        if (registry.serviceConfig.awareness.autoRelaodRegistry)
            setTimeout(awareness_reloadRegistry, registry.serviceConfig.awareness.autoRelaodRegistry);
    }
    return function (req, res, next) {
        if (param.awareness) {
            registry = req.soajs.registry;
            req.soajs.awareness = {
                "getHost": roundRobin
            };
        }
        next();
    };
};