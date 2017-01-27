'use strict';

var drivers = require('soajs.core.drivers');
var core = require('../../modules/soajs.core');
var param = null;

var lib = {
	"constructDriverParam": function(serviceName){
		var info = core.registry.get().deployer.selected.split('.');
		var deployerConfig = core.registry.get().deployer.container[info[1]][info[2]];
		
		return {
			"strategy": process.env.SOAJS_DEPLOY_HA,
			"driver": info[1] + "." + info[2],
			"deployerConfig": deployerConfig,
			"soajs": {
				"registry": core.registry.get()
			},
			"model": {},
			"params": {
				"serviceName": serviceName,
				"env": process.env.SOAJS_ENV
			}
		};
	},
	
    "getLatestVersion" : function (serviceName, cb){
        var options = lib.constructDriverParam(serviceName);
        drivers.getLatestVersion(options, cb);
    }
};

var ha = {
    "init": function (_param) {
    	param = _param;
    },
    "getServiceHost": function (serviceName, version, cb) {
        if (!cb && typeof version === "function") {
            cb = version;
            version = null;
        }
	
        var options = lib.constructDriverParam(serviceName);
        //if no version was supplied, find the latest version of the service
        if (!version) {
            lib.getLatestVersion("controller", function (err, obtainedVersion) {
                if (err) {
                    //todo: need to find a better way to do this log
	                param.log.error(err);
                    return cb(null);
                }
                options.params.version = obtainedVersion;
                drivers.getServiceHost(options, function(error, response){
                	if(error){
		                param.log.error(error);
                		return cb(null);
	                }
	                return cb(response);
                });
            });
        }
        else {
            options.params.version = version;
            drivers.getServiceHost(options, function(error, response){
	            if(error){
		            param.log.error(error);
		            return cb(null);
	            }
	            return cb(response);
            });
        }
    }

};

module.exports = ha;