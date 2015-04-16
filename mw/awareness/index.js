'use strict';

var request = require('request');

var core = require('../../modules/soajs.core');
/**
 *
 * @param awareness
 * @param serviceName
 * @param registry
 * @param log
 * @returns {Function}
 */
module.exports = function (awareness, serviceName, registry, log) {
    var serviceAwarenessObj = {};
    if (awareness) {
        var awareness_reloadRegistry = function () {
            core.reloadRegistry(serviceName, null, awareness, function (reg) {
                log.info("Self Awareness reloaded registry. next reload is in [" + registry.serviceConfig.awareness.autoRelaodRegistry + "] milliseconds");
                setTimeout(awareness_reloadRegistry, registry.serviceConfig.awareness.autoRelaodRegistry);
            });
        };
        var awareness_healthCheck = function () {
            var s, sObj, i = null;
            //TODO make the check async
            for (s in registry.services) {
                if (registry.services.hasOwnProperty(s) && s !== serviceName) {
                    sObj = registry.services[s];
                    for (i = 0; i < sObj.hosts.length; i++) {
                        var host = sObj.hosts[i];
                        request({
                            'uri': 'http://' + host + ':' + (sObj.port + registry.serviceConfig.maintenancePortInc) + '/heartbeat'
                        }, function (error, response, body) {
                            if (!serviceAwarenessObj[s])
                                serviceAwarenessObj[s] = {"healthy": [], "index": 0};
                            if (!serviceAwarenessObj[s].healthy)
                                serviceAwarenessObj[s].healthy = [];
                            if (!error && response.statusCode === 200) {
                                if (serviceAwarenessObj[s].healthy.indexOf(host) === -1)
                                    serviceAwarenessObj[s].healthy.push(host);
                            }
                            else {
                                log.warn("Self Awareness health check for service [" + s + "] for host [" + host + "] is NOT healthy");
                                if (serviceAwarenessObj[s].healthy.indexOf(host) !== -1) {
                                    for (var ii = 0; ii < serviceAwarenessObj[s].healthy.length; ii++) {
                                        if (serviceAwarenessObj[s].healthy[ii] === host)
                                            serviceAwarenessObj[s].healthy.splice(ii, 1);
                                    }
                                }
                            }
                        });
                    }
                    //console.log(registry.services[s]);
                }
            }
            //console.log(serviceAwarenessObj);
            setTimeout(awareness_healthCheck, registry.serviceConfig.awareness.healthCheckInterval);
        };

        var roundRobin = function (s, cb) {
            if (serviceAwarenessObj[s] && serviceAwarenessObj[s].healthy && serviceAwarenessObj[s].healthy.length > 0) {
                if (!serviceAwarenessObj[s].index || serviceAwarenessObj[s].index >= registry.services[s].hosts.length)
                    serviceAwarenessObj[s].index = 0;
                var host = registry.services[s].hosts[serviceAwarenessObj[s].index];
                if (serviceAwarenessObj[s].healthy.indexOf(host) !== -1)
                    return cb(host);
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
        req.soajs.awareness = {
            "getHost": roundRobin
        };
        next();
    }
};