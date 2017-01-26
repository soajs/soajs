'use strict';

var drivers = require('soajs.core.drivers');
var core = require('../../modules/soajs.core');

var lib = {
    "getLatestVersion" : function (serviceName, cb){
        var options = {
            "strategy": process.env.SOAJS_DEPLOY_HA,
            "driver": core.registry.get().deployer.slected.split('.')[1] + "." + core.registry.get().deployer.slected.split('.')[2],
            "deploterConfig": core.registry.get().deployer,
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
    "init": function (param) {},
    "getServiceHost": function (serviceName, version, cb) {
        if (!cb && typeof version === "function") {
            cb = version;
            version = null;
        }

        var options = {
            "strategy": process.env.SOAJS_DEPLOY_HA,
            "driver": core.registry.get().deployer.slected.split('.')[1] + "." + core.registry.get().deployer.slected.split('.')[2],
            "deploterConfig": core.registry.get().deployer,
            "soajs": {
                "registry": core.registry.get()
            },
            "model": {},
            "params": {
                "serviceNane": serviceName,
                "version": null,
                "env": process.env.SOAJS_ENV
            }
        };
        //if no version was supplied, find the latest version of the service
        if (!version) {
            lib.getLatestVersion("controller", function (err, obtainedVersion) {
                if (err) {
                    //todo: need to find a better way to do this log
                    console.log(err);
                    return cb(null);
                }
                options.params.version = obtainedVersion;
                drivers.getServiceHost(options, cb);
            });
        }
        else {
            options.params.version = version;
            drivers.getServiceHost(options, cb);
        }
    }

};

module.exports = ha;