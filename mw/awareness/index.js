'use strict';

var request = require('request');

var core = require('../../modules/soajs.core');
/**
 *
 * @param param
 * @returns {Function}
 */
module.exports = function (param) {
    var serviceAwarenessObj = {};
    if (param.awareness) {
        var awareness_reloadRegistry = function () {
            core.reloadRegistry({"serviceName":param.serviceName, "apiList":param.apiList, "awareness":param.awareness, "serviceIp": param.serviceIp}, function (reg) {
                param.log.info("Self Awareness reloaded registry. next reload is in [" + param.registry.serviceConfig.awareness.autoRelaodRegistry + "] milliseconds");
                setTimeout(awareness_reloadRegistry, param.registry.serviceConfig.awareness.autoRelaodRegistry);
            });
        };
        var awareness_healthCheck = function () {
            var s, sObj, i = null;
            //TODO make the check async
            for (s in param.registry.services) {
                if (param.registry.services.hasOwnProperty(s) && s !== param.serviceName) {
                    sObj = param.registry.services[s];
                    if (sObj.hosts) {
                        for (i = 0; i < sObj.hosts.length; i++) {
                            var host = sObj.hosts[i];
                            request({
                                'uri': 'http://' + host + ':' + (sObj.port + param.registry.serviceConfig.ports.maintenanceInc) + '/heartbeat'
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
                                    param.log.warn("Self Awareness health check for service [" + s + "] for host [" + host + "] is NOT healthy");
                                    if (serviceAwarenessObj[s].healthy.indexOf(host) !== -1) {
                                        //TODO: if we guarantee uniqueness we will not need the for loop
                                        for (var ii = 0; ii < serviceAwarenessObj[s].healthy.length; ii++) {
                                            if (serviceAwarenessObj[s].healthy[ii] === host)
                                                serviceAwarenessObj[s].healthy.splice(ii, 1);
                                        }
                                    }
                                }
                            });
                        }
                    }
                    //console.log(registry.services[s]);
                }
            }
            //console.log(serviceAwarenessObj);
            setTimeout(awareness_healthCheck, param.registry.serviceConfig.awareness.healthCheckInterval);
        };

        var roundRobin = function (s, cb) {
            if (s && param.registry.services[s] && param.registry.services[s].hosts && serviceAwarenessObj[s] && serviceAwarenessObj[s].healthy && serviceAwarenessObj[s].healthy.length > 0) {
                if (!serviceAwarenessObj[s].index || serviceAwarenessObj[s].index >= param.registry.services[s].hosts.length)
                    serviceAwarenessObj[s].index = 0;
                var host = param.registry.services[s].hosts[serviceAwarenessObj[s].index];
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

        if (param.registry.serviceConfig.awareness.healthCheckInterval)
            awareness_healthCheck();
        if (param.registry.serviceConfig.awareness.autoRelaodRegistry)
            setTimeout(awareness_reloadRegistry, param.registry.serviceConfig.awareness.autoRelaodRegistry);
    }
    return function (req, res, next) {
        req.soajs.awareness = {
            "getHost": roundRobin
        };
        next();
    }
};