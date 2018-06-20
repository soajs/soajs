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
    var confSchema = {
        'status': 1, // 0=Off, 1=On
        'type': 1, // 0= tenant, 1= tenant -> ip
        'window': 60000,
        'limit': 5,
        'retries': 2,
        'delay': 1000
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

        console.log(remainingLifetime);

        if (remainingLifetime < 1) {
            throttlingObj.firstReqTime = new Date(Date.now());
            throttlingObj.count = 0;
        }

        if (obj.retry === 0) {
            throttlingObj.count++;
            throttlingObj.lastReqTime = new Date(Date.now());
        }
        console.log(dataHolder);

        if (throttlingObj.count > throttling.limit) {
            obj.retry++;
            if (obj.retry <= throttling.retries) {
                console.log("going to wait");
                setTimeout(function () {
                    console.log("end of waiting");
                    checkThrottling({'trafficKey': trafficKey, 'throttling': throttling, 'retry': obj.retry}, cb);
                }, throttling.delay);
            }
            else
                return cb(false);
        }
        else {
            return cb(true);
        }
    };

    return function (req, res, next) {
        req.soajs.registry.serviceConfig.throttling = confSchema;
        if (req && req.soajs && req.soajs.registry && req.soajs.registry.serviceConfig && req.soajs.registry.serviceConfig.throttling && req.soajs.registry.serviceConfig.throttling.status && req.soajs.tenant && req.soajs.controller) {

            var serviceName = req.soajs.controller.serviceParams.name;

            if (req.soajs.servicesConfig && req.soajs.servicesConfig[serviceName] && req.soajs.servicesConfig[serviceName].SOAJS && req.soajs.servicesConfig[serviceName].SOAJS.THROTTLING && req.soajs.servicesConfig[serviceName].SOAJS.THROTTLING.disabled) {
                return next();
            }
            //console.log (req.soajs.registry.serviceConfig);

            var throttling = req.soajs.registry.serviceConfig.throttling;
            var trafficKey = {"l1": req.soajs.tenant.id, "l2": req.getClientIP()};

            checkThrottling({'trafficKey': trafficKey, 'throttling': throttling, 'retry': 0}, function (result) {
                console.log(req.soajs.controller.serviceParams.path);

                if (result) {
                    return next();
                }
                else {
                    //res.status(429);
                    //res.header('Retry-After', remainingLifetime/1000);
                    //res.header('X-RateLimit-Limit', throttling.limit);
                    //res.header('X-RateLimit-Remaining', throttling.limit-throttlingObj.count);
                    req.soajs.controllerResponse({'status': 429, 'msg': "too many requests"});
                }
            });
        }
        else {
            return next();
        }
    };
};
