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
    var serviceAwarenessObj = {};
    if (param.awareness) {
        var awareness_reloadRegistry = function () {
            core.reloadRegistry({
                "serviceName": param.serviceName,
                "apiList": param.apiList,
                "awareness": param.awareness,
                "serviceIp": param.serviceIp
            }, function (reg) {
                param.log.info("Self Awareness reloaded registry. next reload is in [" + param.registry.serviceConfig.awareness.autoRelaodRegistry + "] milliseconds");
                setTimeout(awareness_reloadRegistry, param.registry.serviceConfig.awareness.autoRelaodRegistry);
            });
        };
        var awareness_healthCheck = function () {
            var servicesArr = [];
            for (var s in param.registry.services) {
                if (param.registry.services.hasOwnProperty(s) && s !== param.serviceName) {
                    if (!serviceAwarenessObj[s])
                        serviceAwarenessObj[s] = {"healthy": [], "index": 0};
                    if (!serviceAwarenessObj[s].healthy)
                        serviceAwarenessObj[s].healthy = [];
                    if (param.registry.services[s].hosts && param.registry.services[s].hosts.length > 0) {
                        var sObj = {"name":s,"port" : param.registry.services[s].port};
                        for (var i = 0; i < param.registry.services[s].hosts.length; i++) {
                            sObj.host = param.registry.services[s].hosts[i];
                            servicesArr.push(sObj);
                        }
                    }
                }
            }
            async.each(servicesArr,
                function (sObj, callback) {
                    request({
                        'uri': 'http://' + sObj.host + ':' + (sObj.port + param.registry.serviceConfig.ports.maintenanceInc) + '/heartbeat'
                    }, function (error, response, body) {
                        if (!error && response.statusCode === 200) {
                            if (serviceAwarenessObj[sObj.name].healthy.indexOf(sObj.host) === -1)
                                serviceAwarenessObj[sObj.name].healthy.push(sObj.host);
                        }
                        else {
                            param.log.warn("Self Awareness health check for service [" + sObj.name + "] for host [" + sObj.host + "] is NOT healthy");
                            if (serviceAwarenessObj[sObj.name].healthy.indexOf(sObj.host) !== -1) {
                                //TODO: if we guarantee uniqueness we will not need the for loop
                                for (var ii = 0; ii < serviceAwarenessObj[sObj.name].healthy.length; ii++) {
                                    if (serviceAwarenessObj[sObj.name].healthy[ii] === sObj.host)
                                        serviceAwarenessObj[sObj.name].healthy.splice(ii, 1);
                                }
                            }
                        }
                    });
                }
            );
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