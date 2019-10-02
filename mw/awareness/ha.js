'use strict';
var async = require('async');

var drivers = require('soajs.core.drivers');
var coreModules = require("soajs.core.modules");
var core = coreModules.core;
var param = null;

var regEnvironment = (process.env.SOAJS_ENV || "dev");
regEnvironment = regEnvironment.toLowerCase();

var awarenessCache = {};

let timeout = null;

var lib = {
	"constructDriverParam": function (serviceName) {
		var info = core.registry.get().deployer.selected.split('.');
		var deployerConfig = core.registry.get().deployer.container[info[1]][info[2]];
		
		let strategy = process.env.SOAJS_DEPLOY_HA;
		if (strategy === 'swarm') {
			strategy = 'docker';
		}
		
		var options = {
			"strategy": strategy,
			"driver": info[1] + "." + info[2],
			"deployerConfig": deployerConfig,
			"soajs": {
				"registry": core.registry.get()
			},
			"model": {},
			"params": {
				"env": regEnvironment
			}
		};
		
		if (serviceName) {
			options.params.serviceName = serviceName;
		}
		
		return options;
	},
	
	"getLatestVersion": function (serviceName, cb) {
		var options = lib.constructDriverParam(serviceName);
		drivers.execute({"type": "container", "driver": options.strategy}, 'getLatestVersion', options, cb);
	},
	
	"getHostFromCache": function (serviceName, version) {
		if (awarenessCache[serviceName] &&
			awarenessCache[serviceName][version] &&
			awarenessCache[serviceName][version].host) {
			param.log.debug('Got ' + serviceName + ' - ' + version + ' - ' + awarenessCache[serviceName][version].host + ' from awareness cache');
			return awarenessCache[serviceName][version].host;
		}
		
		return null;
	},
	/*
	"setHostInCache": function (serviceName, version, hostname) {
		if (!awarenessCache[serviceName]) awarenessCache[serviceName] = {};
		if (!awarenessCache[serviceName][version]) awarenessCache[serviceName][version] = {};
		
		awarenessCache[serviceName][version].host = hostname;
	},
	*/
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
			drivers.execute({
				"type": "container",
				"driver": options.strategy
			}, 'getServiceHost', options, (error, response) => {
				if (error) {
					param.log.error(error);
					return cb(null);
				}
				
				//lib.setHostInCache(serviceName, version, response);
				param.log.debug(' .... got ' + serviceName + ' - ' + version + ' - ' + response + ' from cluster API');
				return cb(response);
			});
		}
	},
	
	"rebuildAwarenessCache": function () {
		var myCache = {};
		var options = lib.constructDriverParam();
		drivers.execute({
			"type": "container",
			"driver": options.strategy
		}, 'listServices', options, (error, services) => {
			if (error) {
				param.log.error(error);
				return;
			}
			
			async.each(services, function (oneService, callback) {
				var version, serviceName;
				if (oneService.labels && oneService.labels['soajs.service.version']) {
					version = oneService.labels['soajs.service.version'];
				}
				
				if (oneService.labels && oneService.labels['soajs.service.name']) {
					serviceName = oneService.labels['soajs.service.name'];
				}
				
				param.log.debug('Building awareness for ' + serviceName + ' - ' + version + ' ....');
				
				if (!serviceName)
					return callback();
				
				//if no version is found, lib.getHostFromAPI() will get it from cluster api
				lib.getHostFromAPI(serviceName, version, function (hostname) {
					if (!myCache[serviceName]) myCache[serviceName] = {};
					if (!myCache[serviceName][version]) myCache[serviceName][version] = {};
					myCache[serviceName][version].host = hostname;
					//myCache[serviceName] = {};
					//myCache[serviceName][version] = {host: hostname};
					return callback();
				});
			}, function () {
				awarenessCache = myCache;
				param.log.debug("Awareness cache rebuilt successfully");
				param.log.debug(awarenessCache);
				
				var cacheTTL = core.registry.get().serviceConfig.awareness.cacheTTL;
				if (cacheTTL) {
					if (timeout) {
						clearTimeout(timeout);
					}
					param.log.debug("rebuilding cache in: " + cacheTTL);
					timeout = setTimeout(lib.rebuildAwarenessCache, cacheTTL);
				}
			});
		});
	}
};

var ha = {
	"init": function (_param) {
		param = _param;
		
		lib.rebuildAwarenessCache();
	},
	
	"getServiceHost": function () {
		var serviceName, version, env, cb;
		cb = arguments[arguments.length - 1];
		
		switch (arguments.length) {
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
		
		if (serviceName === 'controller') {
			if (process.env.SOAJS_DEPLOY_HA === 'kubernetes') {
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
				param.log.debug('Getting host for ' + serviceName + ' - ' + version + ' ....');
				lib.getHostFromAPI(serviceName, version, cb);
			}
		}
	},
	
	"getLatestVersionFromCache": function (serviceName) {
		if (!awarenessCache[serviceName]) return null;
		
		var serviceVersions = Object.keys(awarenessCache[serviceName]), latestVersion = 0;
		if (serviceVersions.length === 0) return null;
		
		for (var i = 0; i < serviceVersions.length; i++) {
			if (serviceVersions[i] > latestVersion) {
				latestVersion = serviceVersions[i];
			}
		}
		
		if (latestVersion === 0) return null;
		
		return latestVersion;
	}
};

module.exports = ha;
