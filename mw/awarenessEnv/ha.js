'use strict';

var drivers = require('soajs.core.drivers');
var core = require('../../modules/soajs.core');

var ha = {
    "init" : function (param){},
    "getControllerEnvHost" : function (env, v, cb){
        var options = {
            "strategy": process.env.SOAJS_HA,
            "driver": core.registry.get().deployer.slected.split('.')[1] + "." + core.registry.get().deployer.slected.split('.')[2],
            "deploterConfig": core.registry.get().deployer,
            "soajs": {
                "registry": core.registry.get()
            },
            "model": {},
            "params": {
                "serviceNane": serviceName,
                "version": version,
                "env": process.env.SOAJS_ENV
            }
        };

        drivers.getControllerEnvHost(options, cb);
    }
};

module.exports = ha;