'use strict';

var param = null;

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
		return cb(env + "-" + serviceName);
    }
};

module.exports = ha;
