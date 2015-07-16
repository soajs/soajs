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
                "apiList": param.apiList,
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
                    if (Object.hasOwnProperty.call(registry.services,s) && s !== param.serviceName) {
                        if (!serviceAwarenessObj[s])
                            serviceAwarenessObj[s] = {"healthy": [], "index": 0};
                        if (!serviceAwarenessObj[s].healthy)
                            serviceAwarenessObj[s].healthy = [];
                        if (registry.services[s].hosts && registry.services[s].hosts.length > 0) {
                            for (var i = 0; i < registry.services[s].hosts.length; i++) {
                                var sObj = {
                                    "name": s,
                                    "port": registry.services[s].port,
                                    "host": registry.services[s].hosts[i]
                                };
                                awarenessHosts.servicesArr.push(sObj);
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
                        if (!registry.services[sObj.name].awarenessStats)
                            registry.services[sObj.name].awarenessStats = {};
                        var statusObj = {"lastCheck": new Date().getTime(), "healthy": false};
                        if (!error && response.statusCode === 200) {
                            statusObj.healthy = true;
                            if (serviceAwarenessObj[sObj.name].healthy.indexOf(sObj.host) === -1)
                                serviceAwarenessObj[sObj.name].healthy.push(sObj.host);
                        }
                        else {
                            if (registry.services[sObj.name].awarenessStats[sObj.host] && registry.services[sObj.name].awarenessStats[sObj.host].healthy === false){
                                statusObj.downCount = registry.services[sObj.name].awarenessStats[sObj.host].downCount + 1;
                                statusObj.downSince = registry.services[sObj.name].awarenessStats[sObj.host].downSince;
                            }
                            else{
                                statusObj.downSince = statusObj.lastCheck;
                                statusObj.downCount = 0;
                            }

                            var stopLoggingAfter = registry.serviceConfig.awareness.maxLogCount;
                            if (statusObj.downCount <= stopLoggingAfter)
                                param.log.warn("Self Awareness health check for service [" + sObj.name + "] for host [" + sObj.host + "] is NOT healthy");
                            if (serviceAwarenessObj[sObj.name].healthy.indexOf(sObj.host) !== -1) {
                                //TODO: if we guarantee uniqueness we will not need the for loop
                                for (var ii = 0; ii < serviceAwarenessObj[sObj.name].healthy.length; ii++) {
                                    if (serviceAwarenessObj[sObj.name].healthy[ii] === sObj.host)
                                        serviceAwarenessObj[sObj.name].healthy.splice(ii, 1);
                                }
                            }
                        }
                        registry.services[sObj.name].awarenessStats[sObj.host] = statusObj;
                        callback();
                    });
                }, function (err) {
                    if (err)
                        param.log.warn('Unable to build awareness structure for services: ' + err);
                });
            setTimeout(awareness_healthCheck, registry.serviceConfig.awareness.healthCheckInterval);
        };

        var roundRobin = function (s, cb) {

            if (s && registry.services[s] && registry.services[s].hosts && serviceAwarenessObj[s] && serviceAwarenessObj[s].healthy && serviceAwarenessObj[s].healthy.length > 0) {
                if (!serviceAwarenessObj[s].index || serviceAwarenessObj[s].index >= registry.services[s].hosts.length)
                    serviceAwarenessObj[s].index = 0;
                var host = registry.services[s].hosts[serviceAwarenessObj[s].index];
                if (serviceAwarenessObj[s].healthy.indexOf(host) !== -1) {
                    serviceAwarenessObj[s].index += 1;
                    return cb(host);
                }
                else {
                    serviceAwarenessObj[s].index += 1;
                    return roundRobin(s, cb);
                }
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