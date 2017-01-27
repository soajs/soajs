'use strict';

var drivers = require('soajs.core.drivers');
var core = require('../../modules/soajs.core');

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
	    console.log(JSON.stringify(options, null, 2));
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
	    
        var options = lib.constructDriverParam("controller");
        
        //if no version was supplied, find the latest version of the service
        if(!v){
            lib.getLatestVersion("controller", function (err, obtainedVersion) {
                if(err){
                    //todo: need to find a better way to do this log
                    console.log(err);
                    return cb(null);
                }
                options.params.version = obtainedVersion;
	            console.log(JSON.stringify(options, null, 2));
                drivers.getServiceHost(options, cb);
            });
        }
        else{
            options.params.version = v;
	        console.log(JSON.stringify(options, null, 2));
            drivers.getServiceHost(options, cb);
        }
    }
};

module.exports = ha;