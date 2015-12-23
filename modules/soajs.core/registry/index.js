'use strict';
var fs = require('fs');
var os = require("os");
var request = require('request');
var async = require('async');
var Mongo = require('../../soajs.mongo');

var autoRegHost = process.env.SOAJS_SRV_AUTOREGISTERHOST || true;
if (autoRegHost && typeof(autoRegHost) !== 'boolean') {
    autoRegHost = (autoRegHost === 'true');
}

var regEnvironment = (process.env.SOAJS_ENV || "dev");
regEnvironment = regEnvironment.toLowerCase();
var regFile = (process.env.SOAJS_PROFILE || __dirname + "/../../../profiles/single.js");

var mongo;
var registry_struct = {};
registry_struct[regEnvironment] = null;

var build = {
        "metaAndCoreDB": function (STRUCT) {
            var metaAndCoreDB = {"metaDB": {}, "coreDB": {}};

            if (STRUCT && STRUCT.dbs && STRUCT.dbs.databases) {
                for (var dbName in STRUCT.dbs.databases) {
                    if (Object.hasOwnProperty.call(STRUCT.dbs.databases, dbName)) {
                        var dbRec = STRUCT.dbs.databases[dbName];
                        var dbObj = null;
                        if (dbRec.cluster && STRUCT.dbs.clusters[dbRec.cluster]) {
                            dbObj = {
                                "prefix": STRUCT.dbs.config.prefix,
                                "servers": STRUCT.dbs.clusters[dbRec.cluster].servers,
                                "credentials": STRUCT.dbs.clusters[dbRec.cluster].credentials,
                                "URLParam": STRUCT.dbs.clusters[dbRec.cluster].URLParam,
                                "extraParam": STRUCT.dbs.clusters[dbRec.cluster].extraParam
                            };
                            if (dbRec.tenantSpecific) {
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

        "sessionDB": function (STRUCT) {
            var sessionDB = null;
            if (STRUCT && STRUCT.dbs && STRUCT.dbs.config && STRUCT.dbs.config.session) {
                if (STRUCT.dbs.config.session) {
                    var dbRec = STRUCT.dbs.config.session;
                    if (dbRec.cluster && STRUCT.dbs.clusters[dbRec.cluster]) {
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

        "allServices": function (STRUCT, servicesObj) {
            if (STRUCT && Array.isArray(STRUCT) && STRUCT.length > 0) {
                for (var i = 0; i < STRUCT.length; i++) {
                    if (STRUCT[i].name === 'controller') {
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

        "allDaemons": function (STRUCT, servicesObj) {
            if (STRUCT && Array.isArray(STRUCT) && STRUCT.length > 0) {
                for (var i = 0; i < STRUCT.length; i++) {
                    if (STRUCT[i].name === 'controller') {
                        continue;
                    }
                    servicesObj[STRUCT[i].name] = {
                        "port": STRUCT[i].port
                    };
                }
            }
        },

        "servicesHosts": function (STRUCT, servicesObj) {
            if (STRUCT && Array.isArray(STRUCT) && STRUCT.length > 0) {
                for (var i = 0; i < STRUCT.length; i++) {
                    if (STRUCT[i].env === regEnvironment) {
                        if (servicesObj[STRUCT[i].name]) {
                            if (!STRUCT[i].version)
                                STRUCT[i].version = 1;
                            if (!servicesObj[STRUCT[i].name].hosts) {
                                servicesObj[STRUCT[i].name].hosts = {};
                                servicesObj[STRUCT[i].name].hosts.latest = STRUCT[i].version;
                                servicesObj[STRUCT[i].name].hosts[STRUCT[i].version] = [];
                            }
                            if (!servicesObj[STRUCT[i].name].hosts[STRUCT[i].version]){
                                servicesObj[STRUCT[i].name].hosts[STRUCT[i].version] = [];
                            }
                            if (STRUCT[i].version > servicesObj[STRUCT[i].name].hosts.latest){
                                servicesObj[STRUCT[i].name].hosts.latest = STRUCT[i].version;
                            }
                            if (servicesObj[STRUCT[i].name].hosts[STRUCT[i].version].indexOf(STRUCT[i].ip) === -1) {
                                servicesObj[STRUCT[i].name].hosts[STRUCT[i].version].push(STRUCT[i].ip);
                            }
                        }
                    }
                }
            }
        },
        "service": function (STRUCT, serviceName) {
            var serviceObj = null;
            if (STRUCT && Array.isArray(STRUCT) && STRUCT.length > 0) {
                for (var i = 0; i < STRUCT.length; i++) {
                    if (STRUCT[i].name === serviceName) {
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
        "daemon": function (STRUCT, serviceName) {
            var serviceObj = null;
            if (STRUCT && Array.isArray(STRUCT) && STRUCT.length > 0) {
                for (var i = 0; i < STRUCT.length; i++) {
                    if (STRUCT[i].name === serviceName) {
                        //TODO: add env specific info in object below ie: interval=3000, status=1||0,
                        serviceObj = {
                            "port": STRUCT[i].port
                        };
                        break;
                    }
                }
            }
            return serviceObj;
        },

        "controllerHosts": function (STRUCT, controllerObj) {
            if (STRUCT && Array.isArray(STRUCT) && STRUCT.length > 0) {
                for (var i = 0; i < STRUCT.length; i++) {
                    if (STRUCT[i].name === "controller" && STRUCT[i].env === regEnvironment) {
                        if (!STRUCT[i].version)
                            STRUCT[i].version = 1;
                        if (!controllerObj.hosts) {
                            controllerObj.hosts = {};
                            controllerObj.hosts.latest = STRUCT[i].version;
                            controllerObj.hosts[STRUCT[i].version] = [];
                        }
                        if (!controllerObj.hosts[STRUCT[i].version]){
                            controllerObj.hosts[STRUCT[i].version] = [];
                        }
                        if (STRUCT[i].version > controllerObj.hosts.latest){
                            controllerObj.hosts.latest = STRUCT[i].version;
                        }
                        if (controllerObj.hosts[STRUCT[i].version].indexOf(STRUCT[i].ip) === -1) {
                            controllerObj.hosts[STRUCT[i].version].push(STRUCT[i].ip);
                        }
                    }
                }
            }
        },

        "loadDBInformation": function (dbConfiguration, envCode, param, callback) {
            if (!mongo) {
                mongo = new Mongo(dbConfiguration);
            }
            mongo.findOne('environment', {'code': envCode.toUpperCase()}, function (error, envRecord) {
                if (error) {
                    return callback(error);
                }
                var obj = {};
                if (envRecord && JSON.stringify(envRecord) !== '{}') {
                    obj['ENV_schema'] = envRecord;
                }
                mongo.find('hosts', {'env': envCode}, function (error, hostsRecords) {
                    if (error) {
                        return callback(error);
                    }
                    if (hostsRecords && Array.isArray(hostsRecords) && hostsRecords.length > 0) {
                        obj['ENV_hosts'] = hostsRecords;
                    }
                    mongo.find('services', function (error, servicesRecords) {
                        if (error) {
                            return callback(error);
                        }
                        if (servicesRecords && Array.isArray(servicesRecords) && servicesRecords.length > 0) {
                            obj['services_schema'] = servicesRecords;
                        }
                        mongo.find('daemons', function (error, daemonsRecords) {
                            if (error) {
                                return callback(error);
                            }
                            if (servicesRecords && Array.isArray(daemonsRecords) && daemonsRecords.length > 0) {
                                obj['daemons_schema'] = daemonsRecords;
                            }
                            return callback(null, obj);
                        });
                    });
                });
            });
        },

        "registerNewService": function (dbConfiguration, serviceObj, ports, collection, cb) {
            if (!mongo) {
                mongo = new Mongo(dbConfiguration);
            }
            mongo.findOne(collection, {'port': serviceObj.port, 'name' : {'$ne': serviceObj.name}}, function (error, record) {
                if (error) {
                    return cb(error, null);
                }
                if (!record) {
                    //mongo.insert(collection, serviceObj, cb);
                    mongo.update(collection, {'name' : serviceObj.name}, {'$set': serviceObj}, {'upsert': true}, function (error) {
                        return cb (error, serviceObj.port);
                    });
                }
                else {
                    serviceObj.port = randomInt(ports.controller + ports.randomInc, ports.controller + ports.maintenanceInc);
                    build.registerNewService(dbConfiguration, serviceObj, ports, collection, cb);
                }
            });
        },

        "checkRegisterServiceIP": function (dbConfiguration, hostObj, cb) {
            if (!mongo) {
                mongo = new Mongo(dbConfiguration);
            }
            mongo.update('hosts', hostObj, {'$set': hostObj}, {'upsert': true}, function (err) {
                if (err) {
                    return cb(err, false);
                }
                return cb(null, true);
            });
            /*
            //check if this host has this ip in the env
            mongo.findOne('hosts', hostObj, function (error, dbRecord) {
                if (error || dbRecord) {
                    return cb(error, false);
                }
                if (!dbRecord) {
                    mongo.insert('hosts', hostObj, function (err) {
                        if (err) {
                            return cb(err, false);
                        }
                        return cb(null, true);
                    });
                }
            });
            */
        },

        "buildRegistry": function (param, registry, registryDBInfo, callback) {
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
            if (!registryDBInfo.ENV_schema || !registryDBInfo.ENV_schema.services || !registryDBInfo.ENV_schema.services.config) {
                var err = new Error('Unable to get [' + regEnvironment + '] environment services from db');
                if (!param.reload) {
                    throw err;
                } else {
                    return callback(err);
                }
            }
            registry["serviceConfig"] = registryDBInfo.ENV_schema.services.config;

            for (var coreDBName in metaAndCoreDB.coreDB) {
                if (Object.hasOwnProperty.call(metaAndCoreDB.coreDB, coreDBName)) {
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

            registry["daemons"] = {};

            if (param.serviceName === "controller") {
                build.allServices(registryDBInfo.services_schema, registry["services"]);
                build.servicesHosts(registryDBInfo.ENV_hosts, registry["services"]);
                build.allDaemons(registryDBInfo.daemons_schema, registry["daemons"]);
                build.servicesHosts(registryDBInfo.ENV_hosts, registry["daemons"]);
                return resume("services");
            }
            else {
                if (param.type && param.type === "daemon") {
                    //var daemonServiceObj = build.daemon(registryDBInfo.daemons_schema, param.serviceName);
                    //if (daemonServiceObj) {
                    //    registry["daemons"][param.serviceName] = daemonServiceObj;
                    //    return resume("daemons");
                    //}
                    //else {
                        //registering a new daemon service or update existing
                        var schemaPorts = registryDBInfo.ENV_schema.services.config.ports;
                        registry["daemons"][param.serviceName] = {
                            "port": param.designatedPort || randomInt(schemaPorts.controller + schemaPorts.randomInc, schemaPorts.controller + schemaPorts.maintenanceInc)
                        };
                        //adding daemon service for the first time to services collection
                        var newDaemonServiceObj = {
                            'name': param.serviceName,
                            'port': registry["daemons"][param.serviceName].port,
                            'jobs': param.jobList,
                            'versions' : {},
                            'latest': param.serviceVersion
                        };
                        newDaemonServiceObj.versions[param.serviceVersion] = {};
						if (param.reload){
							return resume("daemons");
						}
	                    else {
							build.registerNewService(registry.coreDB.provision, newDaemonServiceObj, registryDBInfo.ENV_schema.services.config.ports, 'daemons', function (error, port) {
								if (error) {
									throw new Error('Unable to register new daemon service ' + param.serviceName + ' : ' + error.message);
								}
								registry["daemons"][param.serviceName].port = port;
								return resume("daemons");
							});
						}
                    //}
                }
                else {
                    registry["coreDB"]["session"] = build.sessionDB(registryDBInfo.ENV_schema);

                    //var serviceObj = build.service(registryDBInfo.services_schema, param.serviceName);
                    //if (serviceObj) {
                    //    registry["services"][param.serviceName] = serviceObj;
                    //    //todo: check the apis list if they are updated or removed
                    //   return resume("services");
                    //}
                    //else {
                        //registering a new service
                        var schemaPorts = registryDBInfo.ENV_schema.services.config.ports;
                        registry["services"][param.serviceName] = {
                            "extKeyRequired": param.extKeyRequired || false,
                            "port": param.designatedPort || randomInt(schemaPorts.controller + schemaPorts.randomInc, schemaPorts.controller + schemaPorts.maintenanceInc),
                            "requestTimeout": param.requestTimeout,
                            "requestTimeoutRenewal": param.requestTimeoutRenewal,
                            "awareness": param.awareness
                        };
		                if (param.reload){
			                return resume("services");
		                }
	                    else {
			                //adding service for the first time to services collection
			                var newServiceObj = {
				                'name': param.serviceName,
				                'extKeyRequired': registry["services"][param.serviceName].extKeyRequired,
				                'port': registry["services"][param.serviceName].port,
				                'requestTimeout': registry["services"][param.serviceName].requestTimeout,
				                'requestTimeoutRenewal': registry["services"][param.serviceName].requestTimeoutRenewal,
				                'awareness': param.awareness,
				                'apis': param.apiList,
				                'versions': {},
				                'latest': param.serviceVersion
			                };
			                newServiceObj.versions[param.serviceVersion] = {};

			                build.registerNewService(registry.coreDB.provision, newServiceObj, registryDBInfo.ENV_schema.services.config.ports, 'services', function (error, port) {
				                if (error) {
					                throw new Error('Unable to register new service ' + param.serviceName + ' : ' + error.message);
				                }
				                registry["services"][param.serviceName].port = port;
				                return resume("services");
			                });
		                }
                    //}
                }
            }
            function resume(what) {
                build.controllerHosts(registryDBInfo.ENV_hosts, registry["services"].controller);
                if (!autoRegHost || param.reload) {
                    return callback();
                }
                else if (param.serviceIp) {
                    var hostObj = {
                        'env': registry.name.toLowerCase(),
                        'name': param.serviceName,
                        'ip': param.serviceIp,
                        'hostname': os.hostname().toLowerCase(),
                        'version' : param.serviceVersion
                    };
                    build.checkRegisterServiceIP(registry.coreDB.provision, hostObj, function (error, registered) {
                        if (error) {
                            throw new Error("Unable to register new host for service:" + error.message);
                        }
                        if (registered && registry.serviceConfig.awareness.autoRegisterService) {
                            registry[what][param.serviceName].newServiceOrHost = true;
                            if (!registry[what][param.serviceName].hosts) {
                                    registry[what][param.serviceName].hosts = {};
                                    registry[what][param.serviceName].hosts.latest = param.serviceVersion;
                                    registry[what][param.serviceName].hosts[param.serviceVersion] = [];
                            }
                                if (!registry[what][param.serviceName].hosts[param.serviceVersion]) {
                                    registry[what][param.serviceName].hosts[param.serviceVersion] = [];
                                }
                                registry[what][param.serviceName].hosts[param.serviceVersion].push(param.serviceIp);
                        }
                        return callback();
                    });
                }
                else {
                    if (!param.serviceIp) {
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
    if (fs.existsSync(regFile)) {
        delete require.cache[require.resolve(regFile)];
        var regFileObj = require(regFile);
        if (regFileObj && typeof regFileObj === 'object') {
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
    if (registry) {
        build.loadDBInformation(registry.coreDB.provision, regEnvironment, param, function (error, RegistryFromDB) {
            if (error || !RegistryFromDB) {
                if (!param.reload) {
                    throw new Error('Unable to load Registry Db Info: ' + error.message);
                }
                else {
                    return cb(error);
                }
            }
            else {
                build.buildRegistry(param, registry, RegistryFromDB, function () {
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

var getRegistry = function (param, cb) {
    try {
        if (param.reload || !registry_struct[regEnvironment]) {
            loadRegistry(param, function (err) {
                return cb(err, registry_struct[regEnvironment]);
            });
        }
        else {
            return cb(null, registry_struct[regEnvironment]);
        }
    } catch (e) {
        throw new Error('Failed to get registry: ' + e.message);
    }
};

exports.profile = function (cb) {
    var registry = loadProfile();
    return cb(registry);
};
exports.register = function (param, cb) {
    if (param.ip && param.name) {
        var what = ((param.type === "service") ? "services" : "daemons");
        if (!registry_struct[regEnvironment][what][param.name]) {
            if (!param.port) {
                return cb(new Error("unable to register service. missing params"));
            }
            if (param.type === "service") {
                registry_struct[regEnvironment][what][param.name] = {
                    "port": param.port,
                    "extKeyRequired": param.extKeyRequired || false,
                    "requestTimeout": param.requestTimeout,
                    "requestTimeoutRenewal": param.requestTimeoutRenewal
                };
            }
            else {
                registry_struct[regEnvironment][what][param.name] = {
                    "port": param.port
                };
            }
        }
        if (!registry_struct[regEnvironment][what][param.name].hosts) {
            registry_struct[regEnvironment][what][param.name].hosts = {};
            registry_struct[regEnvironment][what][param.name].hosts.latest = param.serviceVersion;
        }
        if (!registry_struct[regEnvironment][what][param.name].hosts[param.serviceVersion]){
            registry_struct[regEnvironment][what][param.name].hosts[param.serviceVersion] = [];
        }
        registry_struct[regEnvironment][what][param.name].hosts[param.serviceVersion].push(param.ip);
        registry_struct[regEnvironment].timeLoaded = new Date().getTime();
        return cb(null, registry_struct[regEnvironment][what][param.name]);
    }
    return cb(new Error("unable to register service. missing params"));
};
exports.get = function () {
    return registry_struct[regEnvironment];
};
exports.load = function (param, cb) {
    if (!param) param = {};
    param.reload = false;
    return getRegistry(param, function (err, reg) {
        return cb(reg);
    });
};
exports.reload = function (param, cb) {
    if (!param) param = {};
    param.reload = true;
    //param.designatedPort = null;
    return getRegistry(param, function (err, reg) {
        return cb(err, reg);
    });
};
exports.autoRegisterService = function (name, serviceIp, serviceVersion, what, cb) {
    var controllerSRV = registry_struct[regEnvironment].services.controller;
    var serviceSRV = registry_struct[regEnvironment][what][name];
    if (!serviceSRV.newServiceOrHost) {
        return cb(null, false);
    }

    if (controllerSRV && controllerSRV.hosts && controllerSRV.hosts.latest && controllerSRV.hosts[controllerSRV.hosts.latest]) {
        async.each(controllerSRV.hosts[controllerSRV.hosts.latest],
            function (ip, callback) {
                var requestOptions = {
                    'uri': 'http://' + ip + ':' + (controllerSRV.port + registry_struct[regEnvironment].serviceConfig.ports.maintenanceInc) + '/register'
                };
                if (what === "daemons") {
                    requestOptions.qs = {
                        "name": name,
                        "port": serviceSRV.port,
                        "ip": serviceIp,
                        "type": "daemon",
                        "version": serviceVersion
                    };
                }
                else {
                    requestOptions.qs = {
                        "name": name,
                        "port": serviceSRV.port,
                        "ip": serviceIp,
                        "type": "service",
                        "version": serviceVersion,
                        "extKeyRequired": serviceSRV.extKeyRequired,
                        "requestTimeout": serviceSRV.requestTimeout,
                        "requestTimeoutRenewal": serviceSRV.requestTimeoutRenewal
                    };
                }
                request(requestOptions, function (error) {
                    return (error) ? callback(error) : callback(null);
                });
            }, function (err) {
                return (err) ? cb(err, false) : cb(null, true);
            });
    }
    else {
        return cb(new Error("Unable to find any controller host"), false);
    }
};