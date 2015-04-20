'use strict';
var fs = require('fs');
var Mongo = require('../../soajs.mongo');

var regEnvironment = (process.env.SOAJS_ENV || "dev");
regEnvironment = regEnvironment.toLowerCase();
var registryDir = (process.env.SOAJS_REGDIR || __dirname + "/../../../");//__dirname);
var projectPath = registryDir + 'profiles/' + (process.env.SOAJS_PRJ || 'default/');
var envPath = projectPath + 'environments/';
var regFile = envPath + regEnvironment.toLowerCase() + '.js';

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
				servicesObj[STRUCT[i].name] = {
					"extKeyRequired": STRUCT[i].extKeyRequired,
					"port": STRUCT[i].port,
					"requestTimeoutRenewal": STRUCT[i].requestTimeoutRenewal || null,
					"requestTimeout": STRUCT[i].requestTimeoutRenewal || null
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
							servicesObj[STRUCT[i].name].hosts.push(STRUCT[i].ip)
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
						"requestTimeout": STRUCT[i].requestTimeoutRenewal || null
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
						controllerObj.hosts.push(STRUCT[i].ip)
					}
				}
			}
		}
	},

	"loadDBInformation": function(dbConfiguration, envCode, callback) {
		var mongo = new Mongo(dbConfiguration);
		mongo.findOne('environment', {'code': envCode.toUpperCase()}, function(error, envRecord) {
			if(error) { return callback(error); }
			mongo.find('hosts', {'env': envCode}, function(error, hostsRecords) {
				if(error) { return callback(error); }
				var servicesNames = [];
				hostsRecords.forEach(function(oneHost) {
					servicesNames.push(oneHost.name);
				});
				//mongo.find('services', {'name': {$in: servicesNames}}, function(error, servicesRecords) {
				mongo.find('services', function(error, servicesRecords) {
					if(error) { return callback(error); }
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
		var mongo = new Mongo(dbConfiguration);
		mongo.findOne('services', {'port': serviceObj.port}, function(error, record) {
			if(error) { return cb(error); }
			if(!record) {
				mongo.insert('services', serviceObj, cb);
			}
			else {
				var newPort = randomInt(ports.controller + ports.randomInc, ports.controller + ports.maintenanceInc);
				serviceObj.port = newPort;
				build.registerNewService(dbConfiguration, serviceObj, ports, cb);
			}
		})
	},

	"checkRegisterServiceIP": function(dbConfiguration, hostObj, cb) {
		var mongo = new Mongo(dbConfiguration);
		//check if this host has this ip in the env
		mongo.findOne('hosts', hostObj, function(error, dbRecord) {
			if(error || dbRecord) { return cb(error); }
			if(!dbRecord) {
				mongo.insert('hosts', hostObj, function(err, record){
                    return cb();
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
				"requestTimeout": registryDBInfo.ENV_schema.services.controller.requestTimeout,
				"requestTimeoutRenewal": registryDBInfo.ENV_schema.services.controller.requestTimeoutRenewal
			}
		};

		//console.log(param.serviceName);
		//console.log(registryDBInfo)
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
				registry["services"][param.serviceName] = {
					"extKeyRequired": param.extKeyRequired || false,
					"port": param.designatedPort ||
					        randomInt(registryDBInfo.ENV_schema.services.config.ports.controller +
					                  registryDBInfo.ENV_schema.services.config.ports.randomInc, registryDBInfo.ENV_schema.services.config.ports.controller +
					                                                                             registryDBInfo.ENV_schema.services.config.ports.maintenanceInc)
				};

				//adding service for the first time to services collection
				var newServiceObj = {
					'name': param.serviceName,
					'extKeyRequired': registry["services"][param.serviceName].extKeyRequired,
					'port': registry["services"][param.serviceName].port,
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
			if(param.serviceName !== 'controller' && param.awareness) {
				build.controllerHosts(registryDBInfo.ENV_hosts, registry["services"].controller);
			}
			if(param.serviceIp) {
				var hostObj = {
					'env': registry.name.toLowerCase(),
					'name': param.serviceName,
					'ip': param.serviceIp
				};
				build.checkRegisterServiceIP(registry.coreDB.provision, hostObj, function(error) {
					if(error) {
						throw new Error("Unable to register new host for service:" + error.message);
					}
					callback();
				});
			}
		}
	}
};

function randomInt(low, high) {
	return Math.floor(Math.random() * (high - low) + low);
}

function loadRegistry(param, cb) {

	if(fs.existsSync(regFile)) {
		delete require.cache[require.resolve(regFile)];
		var regFileObj = require(regFile);
		if(regFileObj && typeof regFileObj === 'object') {
			var registry = {
				"projectPath": projectPath,
				"name": regFileObj.name,
				"version": regFileObj.version,
				"environment": regFileObj.environment,
				"coreDB": {
					"provision": regFileObj.provisionDB
				}
			};
			build.loadDBInformation(registry.coreDB.provision, registry.name, function(error, RegistryFromDB) {
				if(error || !RegistryFromDB) {
					throw new Error('Unable to load Registry Db Info: ' + error.message);
				}
				else {
					if(!RegistryFromDB.ENV_schema || !RegistryFromDB.services_schema || !RegistryFromDB.ENV_hosts){
						throw new Error('Unable to load Registry Db Info. ');
					}

					build.buildRegistry(param, registry, RegistryFromDB, function() {
						registry_struct[regEnvironment] = registry;
						return cb();
					});
				}
			});
		}
		else {
			throw new Error('Invalid profile path: ' + regFile);
		}
	}
	else {
		throw new Error('Invalid profile path: ' + regFile);
	}
}

exports.getRegistry = function(param, cb) {
	try {
		if(param.reload || !registry_struct[regEnvironment]) {
			loadRegistry(param, function() {
				return cb(registry_struct[regEnvironment]);
			});
		}
		else {
			return cb(registry_struct[regEnvironment]);
		}
	} catch(e) {
		throw new Error('Failed to get registry: ' + e.message);
	}
};