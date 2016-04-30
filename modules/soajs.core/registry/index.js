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
    "metaAndCoreDB": function (STRUCT, envCode) {
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
                        dbObj.registryLocation = {"l1": "metaDB", "l2": dbName, "env": envCode};
                        if (dbRec.tenantSpecific) {
                            dbObj.name = "#TENANT_NAME#_" + dbName;
                            metaAndCoreDB.metaDB[dbName] = dbObj;
                        }
                        else {
                            dbObj.registryLocation.l1 = "coreDB";
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
                    "group": STRUCT[i].group || "service",
                    "port": STRUCT[i].port,
                    "versions": STRUCT[i].versions,
                    "requestTimeoutRenewal": STRUCT[i].requestTimeoutRenewal || null,
                    "requestTimeout": STRUCT[i].requestTimeout || null
                };
                for (var ver in STRUCT[i].versions) {
                    if (Object.hasOwnProperty.call(STRUCT[i].versions, ver)) {
                        var i_ver = parseInt(ver);
                        if (isNaN(i_ver))
                            i_ver = 1;
                        if (!servicesObj[STRUCT[i].name].version)
                            servicesObj[STRUCT[i].name].version = i_ver;
                        if (i_ver >= servicesObj[STRUCT[i].name].version) {
                            servicesObj[STRUCT[i].name].extKeyRequired = servicesObj[STRUCT[i].name].versions[ver].extKeyRequired || false;
                            servicesObj[STRUCT[i].name].awareness = servicesObj[STRUCT[i].name].versions[ver].awareness || false;
                        }
                    }
                }
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
                    "group": STRUCT[i].group || "daemon",
                    "port": STRUCT[i].port,
                    "versions": STRUCT[i].versions
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
                        if (!servicesObj[STRUCT[i].name].hosts[STRUCT[i].version]) {
                            servicesObj[STRUCT[i].name].hosts[STRUCT[i].version] = [];
                        }
                        if (STRUCT[i].version > servicesObj[STRUCT[i].name].hosts.latest) {
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
                    if (!controllerObj.hosts[STRUCT[i].version]) {
                        controllerObj.hosts[STRUCT[i].version] = [];
                    }
                    if (STRUCT[i].version > controllerObj.hosts.latest) {
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

    "registerNewService": function (dbConfiguration, serviceObj, collection, cb) {
        var port = parseInt(serviceObj.port);
        if (isNaN(port)) {
            var error1 = new Error('Service port must be integer: [' + serviceObj.port + ']');
            return cb(error1);
        }
        if (!mongo) {
            mongo = new Mongo(dbConfiguration);
        }
        mongo.findOne(collection, {
            'port': serviceObj.port,
            'name': {'$ne': serviceObj.name}
        }, function (error, record) {
            if (error) {
                return cb(error, null);
            }
            if (!record) {
                var s = {
                    '$set': {}
                };
                for (var p in serviceObj) {
                    if (Object.hasOwnProperty.call(serviceObj, p)) {
                        if (p !== "versions")
                            s.$set[p] = serviceObj[p];
                    }
                }
                if (serviceObj.versions) {
                    for (var pv in serviceObj.versions) {
                        if (Object.hasOwnProperty.call(serviceObj.versions, pv)) {
                            s.$set['versions.' + pv] = serviceObj.versions[pv];
                        }
                    }
                }
                mongo.update(collection, {'name': serviceObj.name}, s, {'upsert': true}, function (error) {
                    return cb(error);
                });
            }
            else {
                var error2 = new Error('Service port [' + serviceObj.port + '] is taken by another service [' + record.name + '].');
                return cb(error2);
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
    },

    "buildRegistry": function (registry, registryDBInfo, callback) {
        var metaAndCoreDB = build.metaAndCoreDB(registryDBInfo.ENV_schema, registry.environment);
        registry["tenantMetaDB"] = metaAndCoreDB.metaDB;
        if (!registryDBInfo.ENV_schema || !registryDBInfo.ENV_schema.services || !registryDBInfo.ENV_schema.services.config) {
            var err = new Error('Unable to get [' + registry.environment + '] environment services from db');
            return callback(err);
        }
        registry["serviceConfig"] = registryDBInfo.ENV_schema.services.config;

        for (var coreDBName in metaAndCoreDB.coreDB) {
            if (Object.hasOwnProperty.call(metaAndCoreDB.coreDB, coreDBName)) {
                registry["coreDB"][coreDBName] = metaAndCoreDB.coreDB[coreDBName];
            }
        }

        registry["services"] = {
            "controller": {
                "group": "controller",
                "maxPoolSize": registryDBInfo.ENV_schema.services.controller.maxPoolSize,
                "authorization": registryDBInfo.ENV_schema.services.controller.authorization,
                "port": registryDBInfo.ENV_schema.services.config.ports.controller,
                "requestTimeout": registryDBInfo.ENV_schema.services.controller.requestTimeout || null,
                "requestTimeoutRenewal": registryDBInfo.ENV_schema.services.controller.requestTimeoutRenewal || null
            }
        };

        registry["coreDB"]["session"] = build.sessionDB(registryDBInfo.ENV_schema);
        registry["coreDB"]["session"].registryLocation = {"l1": "coreDB", "l2": "session", "env": registry.environment};

        registry["daemons"] = {};
        return callback(null);
    },

    "buildSpecificRegistry": function (param, registry, registryDBInfo, callback) {
        if (param.serviceName === "controller") {
            build.allServices(registryDBInfo.services_schema, registry["services"]);
            build.servicesHosts(registryDBInfo.ENV_hosts, registry["services"]);
            build.allDaemons(registryDBInfo.daemons_schema, registry["daemons"]);
            build.servicesHosts(registryDBInfo.ENV_hosts, registry["daemons"]);
            return resume("services");
        }
        else {
            if (param.type && param.type === "daemon") {
                //var schemaPorts = registryDBInfo.ENV_schema.services.config.ports;
                registry["daemons"][param.serviceName] = {
                    'group': param.serviceGroup,
                    'port': param.designatedPort,
                    'version': param.serviceVersion,
                };
                if (param.reload) {
                    return resume("daemons");
                }
                else {
                    //adding daemon service for the first time to services collection
                    var newDaemonServiceObj = {
                        'name': param.serviceName,
                        'group': param.serviceGroup,
                        'port': registry["daemons"][param.serviceName].port,
                        'versions': {}
                    };
                    newDaemonServiceObj.versions[param.serviceVersion] = {
                        'jobs': param.jobList
                    };
                    build.registerNewService(registry.coreDB.provision, newDaemonServiceObj, 'daemons', function (error) {
                        if (error) {
                            throw new Error('Unable to register new daemon service ' + param.serviceName + ' : ' + error.message);
                        }
                        return resume("daemons");
                    });
                }
            }
            else {
                //var schemaPorts = registryDBInfo.ENV_schema.services.config.ports;
                registry["services"][param.serviceName] = {
                    'group': param.serviceGroup,
                    'port': param.designatedPort,
                    'requestTimeout': param.requestTimeout,
                    'requestTimeoutRenewal': param.requestTimeoutRenewal,

                    'version': param.serviceVersion,
                    'extKeyRequired': param.extKeyRequired || false,
                    'awareness': param.awareness
                };
                if (param.reload)
                    return resume("services");
                else {
                    //adding service for the first time to services collection
                    var newServiceObj = {
                        'name': param.serviceName,
                        'group': param.serviceGroup,
                        'port': registry["services"][param.serviceName].port,
                        'requestTimeout': registry["services"][param.serviceName].requestTimeout,
                        'requestTimeoutRenewal': registry["services"][param.serviceName].requestTimeoutRenewal,
                        'versions': {}
                    };
                    newServiceObj.versions[param.serviceVersion] = {
                        "extKeyRequired": registry["services"][param.serviceName].extKeyRequired,
                        "apis": param.apiList,
                        "awareness": param.awareness
                    };

                    build.registerNewService(registry.coreDB.provision, newServiceObj, 'services', function (error) {
                        if (error) {
                            throw new Error('Unable to register new service ' + param.serviceName + ' : ' + error.message);
                        }
                        return resume("services");
                    });
                }
            }
        }
        function resume(what) {
            build.controllerHosts(registryDBInfo.ENV_hosts, registry["services"].controller);
            if (!autoRegHost || param.reload) {
                return callback(null);
            }
            else if (param.serviceIp) {
                var hostObj = {
                    'env': registry.name.toLowerCase(),
                    'name': param.serviceName,
                    'ip': param.serviceIp,
                    'hostname': os.hostname().toLowerCase(),
                    'version': param.serviceVersion
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
                        if (registry[what][param.serviceName].hosts[param.serviceVersion].indexOf(param.serviceIp) === -1)
                            registry[what][param.serviceName].hosts[param.serviceVersion].push(param.serviceIp);
                    }
                    return callback(null);
                });
            }
            else {
                if (!param.serviceIp) {
                    throw new Error("Unable to register new host ip [" + param.serviceIp + "] for service [" + param.serviceName + "]");
                }
                return callback(null);
            }
        }
    }
};

function randomInt(low, high) {
    return Math.floor(Math.random() * (high - low) + low);
}

function loadProfile(envFrom) {
    if (fs.existsSync(regFile)) {
        delete require.cache[require.resolve(regFile)];
        var regFileObj = require(regFile);
        if (regFileObj && typeof regFileObj === 'object') {
            var registry = {
                "timeLoaded": new Date().getTime(),
                "projectPath": regFile.substr(0, regFile.lastIndexOf("/")),
                "name": envFrom || regEnvironment,
                "environment": envFrom || regEnvironment,
                "profileOnly": true,
                "coreDB": {
                    "provision": regFileObj
                }
            };
            registry.coreDB.provision.registryLocation = {
                "l1": "coreDB",
                "l2": "provision",
                "env": registry.environment
            };

            if (!registry_struct[registry.environment])
                registry_struct[registry.environment] = registry;
            else
                registry_struct[registry.environment].coreDB.provision = registry.coreDB.provision;
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
        build.loadDBInformation(registry.coreDB.provision, registry.environment, param, function (error, RegistryFromDB) {
            if (error || !RegistryFromDB) {
                if (!param.reload) {
                    throw new Error('Unable to load Registry Db Info: ' + error.message);
                }
                else {
                    return cb(error);
                }
            }
            else {
                build.buildRegistry(registry, RegistryFromDB, function (err) {
                    if (err) {
                        if (!param.reload) {
                            throw err;
                        } else {
                            return cb(err);
                        }
                    }
                    build.buildSpecificRegistry(param, registry, RegistryFromDB, function (err) {
                        registry.profileOnly = false;
                        registry_struct[registry.environment] = registry;
                        return cb(err);
                    });
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
        if (param.reload || !registry_struct[regEnvironment] || registry_struct[regEnvironment].profileOnly) {
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
        param.extKeyRequired = param.extKeyRequired || false;
        var what = ((param.type === "service") ? "services" : "daemons");
        if (!registry_struct[regEnvironment][what][param.name]) {
            if (!param.port) {
                return cb(new Error("unable to register service. missing params"));
            }
            if (param.type === "service") {
                registry_struct[regEnvironment][what][param.name] = {
                    "group": param.group,
                    "port": param.port,
                    "requestTimeout": param.requestTimeout,
                    "requestTimeoutRenewal": param.requestTimeoutRenewal
                };
            }
            else {
                registry_struct[regEnvironment][what][param.name] = {
                    "group": param.group,
                    "port": param.port
                };
            }
        }

        registry_struct[regEnvironment][what][param.name].extKeyRequired = param.extKeyRequired;
        registry_struct[regEnvironment][what][param.name].version = param.version;

        if (!registry_struct[regEnvironment][what][param.name].versions)
            registry_struct[regEnvironment][what][param.name].versions = {};
        registry_struct[regEnvironment][what][param.name].versions[param.version] = {
            "extKeyRequired": param.extKeyRequired
        };

        if (!registry_struct[regEnvironment][what][param.name].hosts) {
            registry_struct[regEnvironment][what][param.name].hosts = {};
            registry_struct[regEnvironment][what][param.name].hosts.latest = param.version;
        }

        if (!registry_struct[regEnvironment][what][param.name].hosts[param.version]) {
            registry_struct[regEnvironment][what][param.name].hosts[param.version] = [];
        }

        if (registry_struct[regEnvironment][what][param.name].hosts[param.version].indexOf(param.ip) === -1)
            registry_struct[regEnvironment][what][param.name].hosts[param.version].push(param.ip);

        registry_struct[regEnvironment].timeLoaded = new Date().getTime();

        return cb(null, registry_struct[regEnvironment][what][param.name]);
    }
    return cb(new Error("unable to register service. missing params"));
};
exports.get = function (envCode) {
    var env = envCode || regEnvironment;
    return registry_struct[env];
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
    return getRegistry(param, function (err, reg) {
        return cb(err, reg);
    });
};
exports.loadByEnv = function (param, cb) {
    var registry = loadProfile(param.envCode.toLowerCase());
    if (registry) {
        if (!mongo) {
            mongo = new Mongo(registry.coreDB.provision);
        }
        mongo.findOne('environment', {'code': param.envCode.toUpperCase()}, function (err, envRecord) {
            if (err) {
                return cb(err);
            }
            var obj = {};
            if (envRecord && JSON.stringify(envRecord) !== '{}') {
                obj['ENV_schema'] = envRecord;
                build.buildRegistry(registry, obj, function (err) {
                    if (err) {
                        return cb(err);
                    }
                    return cb(null, registry);
                });
            }
        });
    }
    else
        return cb(new Error("unable to find provision config information to connect to!"));
};
exports.loadOtherEnvControllerHosts = function (cb) {
    var registry = loadProfile();
    if (registry) {
        if (!mongo) {
            mongo = new Mongo(registry.coreDB.provision);
        }
        var pattern = new RegExp("controller", "i");
        var condition = (process.env.SOAJS_TEST) ? {'name': {'$regex': pattern}} : {
            'name': {'$regex': pattern},
            'env': {'$ne': regEnvironment}
        };
        mongo.find('hosts', condition, cb);
    }
    else
        return cb(new Error("unable to find provision config information to connect to!"));
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
                        "group": serviceSRV.group,
                        "port": serviceSRV.port,
                        "ip": serviceIp,
                        "type": "daemon",
                        "version": serviceVersion
                    };
                }
                else {
                    requestOptions.qs = {
                        "name": name,
                        "group": serviceSRV.group,
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