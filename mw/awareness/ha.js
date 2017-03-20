'use strict';
var drivers = require('soajs.core.drivers');
var coreModules = require ("soajs.core.modules");
var core = coreModules.core;
var param = null;

var regEnvironment = (process.env.SOAJS_ENV || "dev");
regEnvironment = regEnvironment.toLowerCase();

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

    "getServiceHost": function () {
    	var serviceName, version, env, cb;
	    cb = arguments[arguments.length -1];

	    switch(arguments.length){
	    	//controller, cb
		    case 2:
			    serviceName = arguments[0];
			    break;

		    //controller, 1, cb
		    case 3:
			    serviceName = arguments[0];
			    version = arguments[1];
			    break;

		    //controller, 1, dash, cb [dash is ignored]
		    case 4:
			    serviceName = arguments[0];
			    version = arguments[1];
			    break;
	    }

	    env = regEnvironment;

        if(serviceName === 'controller'){
	        if(process.env.SOAJS_DEPLOY_HA === 'kubernetes'){
		        serviceName += "-v1-service";
	        }
			var info = core.registry.get().deployer.selected.split('.');
			var deployerConfig = core.registry.get().deployer.container[info[1]][info[2]];
			var namespace = '';
			if (deployerConfig && deployerConfig.namespace && deployerConfig.namespace.default) {
				namespace = '.' + deployerConfig.namespace.default;
				if (deployerConfig.namespace.perService) {
					namespace += '-' + env + '-controller-v1';
				}
			}

        	return cb(env + "-" + serviceName + namespace);
        }
        else{
	        var options = lib.constructDriverParam(serviceName);
	        //if no version was supplied, find the latest version of the service
	        if (!version) {
		        lib.getLatestVersion(serviceName, function (err, obtainedVersion) {
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
    }
};

module.exports = ha;
