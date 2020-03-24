'use strict';

var param = null;
var coreModules = require ("soajs.core.modules");
var core = coreModules.core;

var regEnvironment = (process.env.SOAJS_ENV || "dev");
regEnvironment = regEnvironment.toLowerCase();

var ha = {
    "init" : function (_param){
    	param = _param;
    },
    "getControllerEnvHost" : function (){
    	var serviceName, version, env, cb;
    	cb = arguments[arguments.length -1];

    	switch(arguments.length){
    		//dash, cb
		    case 2:
			    env = arguments[0];
			    break;
		    case 3:
		    	//1, dash, cb
			    version = arguments[0];
			    env = arguments[1];
			    break;
		    case 4:
		    	//controller, 1, dash, cb
			    version = arguments[1];
			    env = arguments[2];
		    	break;
	    }

        env = env || regEnvironment;
	    serviceName = "controller";
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
};

module.exports = ha;
