'use strict';

var coreModules = require("soajs.core.modules");
var core = coreModules.core;
/**
 *
 * @param configuration
 * @returns {Function}
 */
module.exports = function (configuration) {


    var dataHolder = {};
    var registryThrottling = {
        "default": {
            'status': 1, // 0=Off, 1=On
            'type': 1, // 0= tenant, 1= tenant -> ip
            'window': 60000,
            'limit': 50,
            'retries': 2,
            'delay': 1000
        },
        "off": {
            'status': 0, // 0=Off, 1=On
            'type': 1, // 0= tenant, 1= tenant -> ip
            'window': 60000,
            'limit': 5,
            'retries': 2,
            'delay': 1000
        },
        "heavy": {
            'status': 1, // 0=Off, 1=On
            'type': 1, // 0= tenant, 1= tenant -> ip
            'window': 60000,
            'limit': 500,
            'retries': 2,
            'delay': 1000
        }
    };


    var checkThrottling = function (obj, cb) {
        var trafficKey = obj.trafficKey;
        var throttling = obj.throttling;

        var throttlingObj = {};

        if (!dataHolder[trafficKey.l1]) {
            dataHolder[trafficKey.l1] = {};
            if (throttling.type === 0) {
                dataHolder[trafficKey.l1] = {
                    'firstReqTime': new Date(Date.now()),
                    'count': 0
                };
            }
        }

        if (throttling.type === 1) {
            if (!dataHolder[trafficKey.l1][trafficKey.l2]) {
                dataHolder[trafficKey.l1][trafficKey.l2] = {
                    'firstReqTime': new Date(Date.now()),
                    'count': 0
                };
            }
            throttlingObj = dataHolder[trafficKey.l1][trafficKey.l2];
        }
        else {
            throttlingObj = dataHolder[trafficKey.l1];
        }

        var remainingLifetime = throttling.window - Math.floor(Date.now() - throttlingObj.firstReqTime.getTime());


        if (remainingLifetime < 1) {
            throttlingObj.firstReqTime = new Date(Date.now());
            throttlingObj.count = 0;
        }

        if (obj.retry === 0) {
            throttlingObj.count++;
            throttlingObj.lastReqTime = new Date(Date.now());
        }


        console.log(dataHolder);
        console.log(remainingLifetime);
        if (throttlingObj.count > throttling.limit) {
            obj.retry++;
            if (obj.retry <= throttling.retries) {
                //console.log("going to wait");
                setTimeout(function () {
                    //console.log("end of waiting");
                    checkThrottling({'trafficKey': trafficKey, 'throttling': throttling, 'retry': obj.retry}, cb);
                }, throttling.delay);
            }
            else {
                return cb({
                    'result': false, 'headObj': {
                        'Retry-After': remainingLifetime / 1000,
                        'X-RateLimit-Limit': throttling.limit,
                        'X-RateLimit-Remaining': throttling.limit - throttlingObj.count
                    }
                });
            }
        }
        else {
            return cb({
                'result': true, 'headObj': {
                    'Retry-After': remainingLifetime / 1000,
                    'X-RateLimit-Limit': throttling.limit,
                    'X-RateLimit-Remaining': throttling.limit - throttlingObj.count
                }
            });
        }
    };

    return function (req, res, next) {
        req.soajs.registry.serviceConfig.throttling = registryThrottling;
        if (req && req.soajs && req.soajs.registry && req.soajs.registry.serviceConfig && req.soajs.registry.serviceConfig.throttling && req.soajs.tenant && req.soajs.controller) {

            var serviceName = req.soajs.controller.serviceParams.name;
            var throttlingStrategy = "default";
            var throttling = req.soajs.registry.serviceConfig.throttling;

            if (req.soajs.servicesConfig && req.soajs.servicesConfig[serviceName] && req.soajs.servicesConfig[serviceName].SOAJS && req.soajs.servicesConfig[serviceName].SOAJS.THROTTLING) {
                if (req.soajs.servicesConfig[serviceName].SOAJS.THROTTLING.disabled)
                    return next();
                else {
                    if (req.soajs.servicesConfig[serviceName].SOAJS.THROTTLING.strategy && throttling[req.soajs.servicesConfig[serviceName].SOAJS.THROTTLING.strategy])
                        throttlingStrategy = req.soajs.servicesConfig[serviceName].SOAJS.THROTTLING.strategy;
                }
            }

            throttling = req.soajs.registry.serviceConfig.throttling[throttlingStrategy];

            if (throttling && throttling.status) {
                var trafficKey = {"l1": req.soajs.tenant.id, "l2": req.getClientIP()};

                checkThrottling({'trafficKey': trafficKey, 'throttling': throttling, 'retry': 0}, function (response) {
                    console.log(response)
                    if (response.result) {
                        return next();
                    }
                    else {
                        req.soajs.controllerResponse({
                            'status': 429,
                            'msg': "too many requests",
                            'headObj': response.headObj
                        });
                    }
                });
            }
            else {
                return next();
            }
        }
        else {
            return next();
        }
    };
};
