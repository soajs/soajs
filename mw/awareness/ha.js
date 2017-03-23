'use strict';
var drivers = require('soajs.core.drivers');
var core = require('../../modules/soajs.core');
var param = null;

var regEnvironment = (process.env.SOAJS_ENV || "dev");
regEnvironment = regEnvironment.toLowerCase();

var awarenessCache = {};

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
				"env": regEnvironment
			}
		};
	},

	"getLatestVersion" : function (serviceName, cb){
		var options = lib.constructDriverParam(serviceName);
		drivers.getLatestVersion(options, cb);
	},

	"getHostFromCache": function (serviceName, version) {
		if (awarenessCache[serviceName] &&
			awarenessCache[serviceName][version] &&
			awarenessCache[serviceName][version].host) {
				param.log.info('Got ' + awarenessCache[serviceName][version].host + ' from awareness cache');
				return awarenessCache[serviceName][version].host;
			}

		return null;
	},

	"setHostInCache": function (serviceName, version, hostname) {
		if (!awarenessCache[serviceName]) awarenessCache[serviceName] = {};
		if (!awarenessCache[serviceName][version]) awarenessCache[serviceName][version] = {};

		awarenessCache[serviceName][version].host = hostname;
	},

	"getHostFromAPI": function (serviceName, version, cb) {
		var options = lib.constructDriverParam(serviceName);
		if (!version) {
			//if no version was supplied, find the latest version of the service
			lib.getLatestVersion(serviceName, function (err, obtainedVersion) {
				if (err) {
					//todo: need to find a better way to do this log
					param.log.error(err);
					return cb(null);
				}

				getHost(obtainedVersion);
			});
		}
		else {
			getHost(version);
		}

		function getHost(version) {
			options.params.version = version;
			drivers.getServiceHost(options, function(error, response){
				if(error){
					param.log.error(error);
					return cb(null);
				}

				lib.setHostInCache(serviceName, version, response);
				param.log.info('Got ' + response + ' from cluster API');
				return cb(response);
			});
		}
	},

	"flushAwarenessCache": function () {
		var cacheTTL = core.registry.get().serviceConfig.awareness.cacheTTL;

		param.log.debug("Flushing awareness cache");
		awarenessCache = {};

		setTimeout(lib.flushAwarenessCache, cacheTTL);
	}
};

var ha = {
    "init": function (_param) {
    	param = _param;

		var cacheTTL = core.registry.get().serviceConfig.awareness.cacheTTL;
		if (cacheTTL) {
			setTimeout(lib.flushAwarenessCache, cacheTTL);
		}
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
		param.log.debug(JSON.stringify (awarenessCache, null, 2));

        if(serviceName === 'controller') {
	        if(process.env.SOAJS_DEPLOY_HA === 'kubernetes') {
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
        else {
			var hostname = lib.getHostFromCache(serviceName, version);
			if (hostname) {
				return cb(hostname);
			}
			else {
				lib.getHostFromAPI(serviceName, version, cb);
			}
        }
    }
};

module.exports = ha;
