'use strict';
var fs = require('fs');
var os = require("os");
var request = require('request');
var async = require('async');
var Mongo = require('../../soajs.mongo');

var autoRegService = process.env.SOAJS_SRV_AUTOREGISTER || false;
var regEnvironment = (process.env.SOAJS_ENV || "dev");
regEnvironment = regEnvironment.toLowerCase();
var regFile = (process.env.SOAJS_PROFILE || __dirname + "/../../../profiles/single.js");

var mongo;
var registry_struct = {};
registry_struct[regEnvironment] = null;

var build = {
	"metaAndCoreDB": function(STRUCT) {
		var metaAndCoreDB = {"metaDB": {}, "coreDB": {}};

		if(STRUCT && STRUCT.dbs && STRUCT.dbs.databases) {
			for(var dbName in STRUCT.dbs.databases) {
				if(STRUCT.dbs.databases.hasOwnProperty(dbName)) {
					var dbRec = STRUCT.dbs.databases[dbName];
					var dbObj = null;
					if(dbRec.cluster && STRUCT.dbs.clusters[dbRec.cluster]) {
						dbObj = {
							"prefix": STRUCT.dbs.config.prefix,
							"servers": STRUCT.dbs.clusters[dbRec.cluster].servers,
							"credentials": STRUCT.dbs.clusters[dbRec.cluster].credentials,
							"URLParam": STRUCT.dbs.clusters[dbRec.cluster].URLParam,
							"extraParam": STRUCT.dbs.clusters[dbRec.cluster].extraParam
						};
						if(dbRec.tenantSpecific) {
							dbObj.name = "#TENANT_NAME#_" + dbName;
							metaAndCoreDB.metaDB[dbName] = dbObj;
						}
						else {
							dbObj.name = dbName;
							metaAndCoreDB.coreDB[dbName] = dbObj;
						}
					}
				}
			}
		}

		return metaAndCoreDB;
	},

	"sessionDB": function(STRUCT) {
		var sessionDB = null;
		if(STRUCT && STRUCT.dbs && STRUCT.dbs.config && STRUCT.dbs.config.session) {
			if(STRUCT.dbs.config.session) {
				var dbRec = STRUCT.dbs.config.session;
				if(dbRec.cluster && STRUCT.dbs.clusters[dbRec.cluster]) {
					sessionDB = {
						"name": STRUCT.dbs.config.session.name,
						"prefix": STRUCT.dbs.config.prefix,
						"servers": STRUCT.dbs.clusters[dbRec.cluster].servers,
						"credentials": STRUCT.dbs.clusters[dbRec.cluster].credentials,
						"URLParam": STRUCT.dbs.clusters[dbRec.cluster].URLParam,
						"extraParam": STRUCT.dbs.clusters[dbRec.cluster].extraParam,
						'store': STRUCT.dbs.config.session.store,
						"collection": STRUCT.dbs.config.session.collection,
						'stringify': STRUCT.dbs.config.session.stringify,
						'expireAfter': STRUCT.dbs.config.session.expireAfter
					};
				}
			}
		}
		return sessionDB;
	},

	"allServices": function(STRUCT, servicesObj) {
		if(STRUCT && Array.isArray(STRUCT) && STRUCT.length > 0) {
			for(var i = 0; i < STRUCT.length; i++) {
				if(STRUCT[i].name === 'controller') {
					continue;
				}
				servicesObj[STRUCT[i].name] = {
					"extKeyRequired": STRUCT[i].extKeyRequired,
					"port": STRUCT[i].port,
					"requestTimeoutRenewal": STRUCT[i].requestTimeoutRenewal || null,
					"requestTimeout": STRUCT[i].requestTimeout || null
				};
			}
		}
	},

	"servicesHosts": function(STRUCT, servicesObj) {
		if(STRUCT && Array.isArray(STRUCT) && STRUCT.length > 0) {
			for(var i = 0; i < STRUCT.length; i++) {
				if(STRUCT[i].env === regEnvironment) {
					if(servicesObj[STRUCT[i].name]) {
						if(!servicesObj[STRUCT[i].name].hosts) {
							servicesObj[STRUCT[i].name].hosts = [];
						}
						if(servicesObj[STRUCT[i].name].hosts.indexOf(STRUCT[i].ip) === -1) {
							servicesObj[STRUCT[i].name].hosts.push(STRUCT[i].ip);
						}
					}
				}
			}
		}
	},
	"service": function(STRUCT, serviceName) {
		var serviceObj = null;
		if(STRUCT && Array.isArray(STRUCT) && STRUCT.length > 0) {
			for(var i = 0; i < STRUCT.length; i++) {
				if(STRUCT[i].name === serviceName) {
					serviceObj = {
						"extKeyRequired": STRUCT[i].extKeyRequired,
						"port": STRUCT[i].port,
						"requestTimeoutRenewal": STRUCT[i].requestTimeoutRenewal || null,
						"requestTimeout": STRUCT[i].requestTimeout || null
					};
					break;
				}
			}
		}
		return serviceObj;
	},

	"controllerHosts": function(STRUCT, controllerObj) {
		if(STRUCT && Array.isArray(STRUCT) && STRUCT.length > 0) {
			for(var i = 0; i < STRUCT.length; i++) {
				if(STRUCT[i].name === "controller" && STRUCT[i].env === regEnvironment) {
					if(!controllerObj.hosts) {
						controllerObj.hosts = [];
					}
					if(controllerObj.hosts.indexOf(STRUCT[i].ip) === -1) {
						controllerObj.hosts.push(STRUCT[i].ip);
					}
				}
			}
		}
	},

	"loadDBInformation": function(dbConfiguration, envCode, callback) {
		if(!mongo) {
			mongo = new Mongo(dbConfiguration);
		}
		mongo.findOne('environment', {'code': envCode.toUpperCase()}, function(error, envRecord) {
			if(error) {
				return callback(error);
			}
			mongo.find('hosts', {'env': envCode}, function(error, hostsRecords) {
				if(error) {
					return callback(error);
				}
				var servicesNames = [];
				hostsRecords.forEach(function(oneHost) {
					servicesNames.push(oneHost.name);
				});
				mongo.find('services', function(error, servicesRecords) {
					if(error) {
						return callback(error);
					}
					var obj = {};
					if(envRecord && JSON.stringify(envRecord) !== '{}') {
						obj['ENV_schema'] = envRecord;
					}
					if(servicesRecords && Array.isArray(servicesRecords) && servicesRecords.length > 0) {
						obj['services_schema'] = servicesRecords;
					}
					if(hostsRecords && Array.isArray(hostsRecords) && hostsRecords.length > 0) {
						obj['ENV_hosts'] = hostsRecords;
					}

					return callback(null, obj);
				});
			});
		});
	},

	"registerNewService": function(dbConfiguration, serviceObj, ports, cb) {
		if(!mongo) {
			mongo = new Mongo(dbConfiguration);
		}
		mongo.findOne('services', {'port': serviceObj.port}, function(error, record) {
			if(error) {
				return cb(error);
			}
			if(!record) {
				mongo.insert('services', serviceObj, cb);
			}
			else {
				serviceObj.port = randomInt(ports.controller + ports.randomInc, ports.controller + ports.maintenanceInc);
				build.registerNewService(dbConfiguration, serviceObj, ports, cb);
			}
		});
	},

	"checkRegisterServiceIP": function(dbConfiguration, hostObj, cb) {
		if(!mongo) {
			mongo = new Mongo(dbConfiguration);
		}
		//check if this host has this ip in the env
		mongo.findOne('hosts', hostObj, function(error, dbRecord) {
			if(error || dbRecord) {
				return cb(error, false);
			}
			if(!dbRecord) {
				mongo.insert('hosts', hostObj, function(err) {
					if(err){ return cb(err, false); }
					return cb(null, true);
				});
			}
		});
	},

	"buildRegistry": function(param, registry, registryDBInfo, callback) {
		/**
		 * ENV_schema:
		 * --------------
		 * registry.tenantMetaDB             //tenantSpecific true
		 * registry.serviceConfig
		 * registry.coreDB.session
		 * registry.coreDB                   //tenantSpecific false
		 * registry.services.controller      // without the hosts array
		 *
		 * services_schema:
		 * -------------------
		 * registry.services.SERVICENAME     // if in service
		 * registry.services.EVERYSERVICE    // if in controller only and awareness is true
		 *
		 * ENV_hosts:
		 * -------------
		 * registry.services.controller.hosts   // if in service and awareness is true
		 * registry.services.EVERYSERVICE.hosts // if in controller only and awareness is true
		 */
		var metaAndCoreDB = build.metaAndCoreDB(registryDBInfo.ENV_schema);
		registry["tenantMetaDB"] = metaAndCoreDB.metaDB;
		if(!registryDBInfo.ENV_schema || !registryDBInfo.ENV_schema.services || !registryDBInfo.ENV_schema.services.config) {
			var err = new Error('Unable to get [' + regEnvironment + '] environment services from db');
			if(!param.reload) {
				throw err;
			} else {
				return callback(err);
			}
		}
		registry["serviceConfig"] = registryDBInfo.ENV_schema.services.config;
		registry["coreDB"]["session"] = build.sessionDB(registryDBInfo.ENV_schema);
		for(var coreDBName in metaAndCoreDB.coreDB) {
			if(metaAndCoreDB.coreDB.hasOwnProperty(coreDBName)) {
				registry["coreDB"][coreDBName] = metaAndCoreDB.coreDB[coreDBName];
			}
		}
		registry["services"] = {
			"controller": {
				"maxPoolSize": registryDBInfo.ENV_schema.services.controller.maxPoolSize,
				"authorization": registryDBInfo.ENV_schema.services.controller.authorization,
				"port": registryDBInfo.ENV_schema.services.config.ports.controller,
				"requestTimeout": registryDBInfo.ENV_schema.services.controller.requestTimeout || null,
				"requestTimeoutRenewal": registryDBInfo.ENV_schema.services.controller.requestTimeoutRenewal || null
			}
		};

		if(param.serviceName === "controller") {
			build.allServices(registryDBInfo.services_schema, registry["services"]);
			build.servicesHosts(registryDBInfo.ENV_hosts, registry["services"]);
			resume();
		}
		else {
			var serviceObj = build.service(registryDBInfo.services_schema, param.serviceName);
			if(serviceObj) {
				registry["services"][param.serviceName] = serviceObj;
				//todo: check the apis list if they are updated or removed
				resume();
			}
			else {
				//registering a new service
				var schemaPorts = registryDBInfo.ENV_schema.services.config.ports;
				registry["services"][param.serviceName] = {
					"extKeyRequired": param.extKeyRequired || false,
					"port": param.designatedPort || randomInt(schemaPorts.controller + schemaPorts.randomInc, schemaPorts.controller + schemaPorts.maintenanceInc),
					"requestTimeout": param.requestTimeout,
					"requestTimeoutRenewal": param.requestTimeoutRenewal,
					"awareness": param.awareness
				};

				//adding service for the first time to services collection
				var newServiceObj = {
					'name': param.serviceName,
					'extKeyRequired': registry["services"][param.serviceName].extKeyRequired,
					'port': registry["services"][param.serviceName].port,
					'requestTimeout': registry["services"][param.serviceName].requestTimeout,
					'requestTimeoutRenewal': registry["services"][param.serviceName].requestTimeoutRenewal,
					'awareness': param.awareness,
					'apis': param.apiList
				};
				build.registerNewService(registry.coreDB.provision, newServiceObj, registryDBInfo.ENV_schema.services.config.ports, function(error) {
					if(error) {
						throw new Error('Unable to register new service ' + param.serviceName + ' : ' + error.message);
					}
					resume();
				});
			}
		}

		function resume() {
			//if (param.awareness) {
			build.controllerHosts(registryDBInfo.ENV_hosts, registry["services"].controller);
			//}
			if(param.reload) {
				return callback();
			}
			if(param.serviceIp && autoRegService) {
				var hostObj = {
					'env': registry.name.toLowerCase(),
					'name': param.serviceName,
					'ip': param.serviceIp,
					'hostname': os.hostname().toLowerCase()
				};
				build.checkRegisterServiceIP(registry.coreDB.provision, hostObj, function(error, registered) {
					if(error) {
						throw new Error("Unable to register new host for service:" + error.message);
					}
					if(registered && registry.serviceConfig.awareness.autoRegisterService) {
						registry.services[param.serviceName].newServiceOrHost = true;
						if(!registry.services[param.serviceName].hosts) {
							registry.services[param.serviceName].hosts = [];
						}
						registry.services[param.serviceName].hosts.push(param.serviceIp);
					}
					return callback();
				});
			}
			else {
                if(!param.serviceIp){
				    throw new Error("Unable to register new host ip [" + param.serviceIp + "] for service [" + param.serviceName + "]");
                }
				return callback();
			}
		}
	}
};

function randomInt(low, high) {
	return Math.floor(Math.random() * (high - low) + low);
}

function loadProfile() {
    if(fs.existsSync(regFile)) {
        delete require.cache[require.resolve(regFile)];
        var regFileObj = require(regFile);
        if(regFileObj && typeof regFileObj === 'object') {
            var registry = {
                "timeLoaded": new Date().getTime(),
                "projectPath": regFile.substr(0, regFile.lastIndexOf("/")),
                "name": regEnvironment,
                "environment": regEnvironment,
                "coreDB": {
                    "provision": regFileObj
                }
            };
            return registry;
        }
        else {
            throw new Error('Invalid profile path: ' + regFile);
        }
    }
    else {
        throw new Error('Invalid profile path: ' + regFile);
    }
	return null;
}

function loadRegistry(param, cb) {
	var registry = loadProfile();
    if(registry) {
        build.loadDBInformation(registry.coreDB.provision, regEnvironment, function(error, RegistryFromDB) {
            if(error || !RegistryFromDB) {
                if(!param.reload) {
                    throw new Error('Unable to load Registry Db Info: ' + error.message);
                }
                else {
                    return cb(error);
                }
            }
            else {
                build.buildRegistry(param, registry, RegistryFromDB, function() {
                    registry_struct[regEnvironment] = registry;
                    return cb(null);
                });
            }
        });
    }
    else {
        return cb(null);
    }
}

var getRegistry = function(param, cb) {
	try {
		if(param.reload || !registry_struct[regEnvironment]) {
			loadRegistry(param, function(err) {
				return cb(err, registry_struct[regEnvironment]);
			});
		}
		else {
			return cb(null, registry_struct[regEnvironment]);
		}
	} catch(e) {
		throw new Error('Failed to get registry: ' + e.message);
	}
};

exports.profile = function(cb) {
	var registry = loadProfile();
	return cb(registry);
};
exports.register = function(param, cb) {
	if(param.ip && param.name) {
		if(!registry_struct[regEnvironment].services[param.name]) {
			if(!param.port) {
				return cb(new Error("unable to register service. missing params"));
			}
			registry_struct[regEnvironment].services[param.name] = {
				"extKeyRequired": param.extKeyRequired || false,
				"port": param.port,
				"requestTimeout": param.requestTimeout,
				"requestTimeoutRenewal": param.requestTimeoutRenewal
			};
		}
		if(!registry_struct[regEnvironment].services[param.name].hosts) {
			registry_struct[regEnvironment].services[param.name].hosts = [];
		}
		registry_struct[regEnvironment].services[param.name].hosts.push(param.ip);
		registry_struct[regEnvironment].timeLoaded = new Date().getTime();
		return cb(null, registry_struct[regEnvironment].services[param.name]);
	}
	return cb(new Error("unable to register service. missing params"));
};
exports.get = function() {
	return registry_struct[regEnvironment];
};
exports.load = function(param, cb) {
	if(!param) param = {};
	param.reload = false;
	return getRegistry(param, function(err, reg) {
		return cb(reg);
	});
};
exports.reload = function(param, cb) {
	if(!param) param = {};
	param.reload = true;
	param.designatedPort = null;
	return getRegistry(param, function(err, reg) {
		return cb(err, reg);
	});
};
exports.autoRegisterService = function(name, serviceIp, cb) {
	if(!autoRegService){
        return cb(null, false);
    }
    var controllerSRV = registry_struct[regEnvironment].services.controller;
	var serviceSRV = registry_struct[regEnvironment].services[name];
	if(!serviceSRV.newServiceOrHost) {
		return cb(null, false);
	}
	if(controllerSRV && controllerSRV.hosts) {
		async.each(controllerSRV.hosts,
			function(ip, callback) {
				request({
					'uri': 'http://' + ip + ':' + (controllerSRV.port + registry_struct[regEnvironment].serviceConfig.ports.maintenanceInc) + '/register',
					'qs': {
						"name": name,
						"port": serviceSRV.port,
						"ip": serviceIp,
						"extKeyRequired": serviceSRV.extKeyRequired,
						"requestTimeout": serviceSRV.requestTimeout,
						"requestTimeoutRenewal": serviceSRV.requestTimeoutRenewal
					}
				}, function(error) {
					return (error) ? callback(error) : callback(null);
				});
			}, function(err) {
				return (err) ? cb(err, false) : cb(null, true);
			});
	}
	else {
		return cb(new Error("Unable to find any controller host"), false);
	}
};