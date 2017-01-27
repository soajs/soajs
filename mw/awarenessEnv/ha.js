'use strict';

var drivers = require('soajs.core.drivers');
var core = require('../../modules/soajs.core');

var lib = {
    "getLatestVersion" : function (serviceName, cb){
        var options = {
            "strategy": process.env.SOAJS_DEPLOY_HA,
            "driver": core.registry.get().deployer.selected.split('.')[1] + "." + core.registry.get().deployer.selected.split('.')[2],
            "deployerConfig": core.registry.get().deployer,
            "soajs": {
                "registry": core.registry.get()
            },
            "model": {},
            "params": {
                "serviceNane": serviceName,
                "env": process.env.SOAJS_ENV
            }
        };

        drivers.getLatestVersion(options, cb);
    }
};

var ha = {
    "init" : function (param){},
    "getControllerEnvHost" : function (env, v, cb){
        if (!cb && typeof v === "function") {
            cb = v;
            v = null;
        }

        var options = {
            "strategy": process.env.SOAJS_DEPLOY_HA,
            "driver": core.registry.get().deployer.selected.split('.')[1] + "." + core.registry.get().deployer.selected.split('.')[2],
            "deployerConfig": core.registry.get().deployer,
            "soajs": {
                "registry": core.registry.get()
            },
            "model": {},
            "params": {
                "serviceNane": "controller",
                "version": null,
                "env": process.env.SOAJS_ENV
            }
        };
        //if no version was supplied, find the latest version of the service
        if(!v){
            lib.getLatestVersion("controller", function (err, obtainedVersion) {
                if(err){
                    //todo: need to find a better way to do this log
                    console.log(err);
                    return cb(null);
                }
                options.params.version = obtainedVersion;
                drivers.getServiceHost(options, cb);
            });
        }
        else{
            options.params.version = v;
            drivers.getServiceHost(options, cb);
        }
    },



};

module.exports = ha;