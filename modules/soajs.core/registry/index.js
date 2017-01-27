'use strict';
var fs = require('fs');
var os = require("os");
var request = require('request');
var async = require('async');

var autoRegHost = process.env.SOAJS_SRV_AUTOREGISTERHOST || true;
if (autoRegHost && typeof(autoRegHost) !== 'boolean') {
    autoRegHost = (autoRegHost === 'true');
}

var regEnvironment = (process.env.SOAJS_ENV || "dev");
regEnvironment = regEnvironment.toLowerCase();

var registry_struct = {};
registry_struct[regEnvironment] = null;

var models = {};
models.mongo = require("./mongo.js");

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
                            "streaming": STRUCT.dbs.clusters[dbRec.cluster].streaming,
                            "URLParam": STRUCT.dbs.clusters[dbRec.cluster].URLParam,
                            "extraParam": STRUCT.dbs.clusters[dbRec.cluster].extraParam
                        };
                        if (dbRec.tenantSpecific) {
                            dbObj.name = "#TENANT_NAME#_" + dbName;
                            metaAndCoreDB.metaDB[dbName] = dbObj;
                        }
                        else {
                            dbObj.registryLocation = {"l1": "coreDB", "l2": dbName, "env": envCode};
                            dbObj.name = dbName;
                            metaAndCoreDB.coreDB[dbName] = dbObj;
                        }
                    }
                }
            }
        }

        return metaAndCoreDB;
    },

    "sessionDB": function (STRUCT, env) {
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
                        'expireAfter': STRUCT.dbs.config.session.expireAfter,
                        'registryLocation': {
                            "l1": "coreDB", "l2": "session", "env": env
                        }
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

    "registerNewService": function (dbConfiguration, serviceObj, collection, cb) {
        var port = parseInt(serviceObj.port);
        if (isNaN(port)) {
            var error1 = new Error('Service port must be integer: [' + serviceObj.port + ']');
            return cb(error1);
        }
        return registryModule.model.registerNewService(dbConfiguration, serviceObj, collection, cb);
    },

    "buildRegistry": function (registry, registryDBInfo, callback) {
        var metaAndCoreDB = build.metaAndCoreDB(registryDBInfo.ENV_schema, registry.environment);
        registry["tenantMetaDB"] = metaAndCoreDB.metaDB;
        if (!registryDBInfo.ENV_schema || !registryDBInfo.ENV_schema.services || !registryDBInfo.ENV_schema.services.config) {
            var err = new Error('Unable to get [' + registry.environment + '] environment services from db');
            return callback(err);
        }
        registry["serviceConfig"] = registryDBInfo.ENV_schema.services.config;

        registry["deployer"] = registryDBInfo.ENV_schema.deployer || {};

        registry["custom"] = registryDBInfo.ENV_schema.custom || {};

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

        registry["coreDB"]["session"] = build.sessionDB(registryDBInfo.ENV_schema, registry.environment);

        registry["daemons"] = {};
        return callback(null);
    },

    "buildSpecificRegistry": function (param, registry, registryDBInfo, callback) {

        function resume(what) {
            if (!process.env.SOAJS_DEPLOY_HA)
                build.controllerHosts(registryDBInfo.ENV_hosts, registry["services"].controller);

            if (!autoRegHost || param.reload) {
                return callback(null);
            }
            else if (param.serviceIp) {
                if (registry.serviceConfig.awareness.autoRegisterService) {
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
            }
            else {
                if (!param.serviceIp && !process.env.SOAJS_DEPLOY_HA) {
                    throw new Error("Unable to register new host ip [" + param.serviceIp + "] for service [" + param.serviceName + "]");
                }
                return callback(null);
            }
        }

        if (param.serviceName === "controller") {
            build.allServices(registryDBInfo.services_schema, registry["services"]);

            if (!process.env.SOAJS_DEPLOY_HA)
                build.servicesHosts(registryDBInfo.ENV_hosts, registry["services"]);

            build.allDaemons(registryDBInfo.daemons_schema, registry["daemons"]);

            if (!process.env.SOAJS_DEPLOY_HA)
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
    }
};

function loadProfile(envFrom) {
    var registry = registryModule.model.loadProfile(envFrom);
    if (!registry_struct[registry.environment])
        registry_struct[registry.environment] = registry;
    else {
        registry_struct[registry.environment].timeLoaded = registry.timeLoaded;
        registry_struct[registry.environment].name = registry.name;
        registry_struct[registry.environment].environment = registry.environment;
        registry_struct[registry.environment].profileOnly = registry.profileOnly;
        registry_struct[registry.environment].coreDB.provision = registry.coreDB.provision;
    }
    return registry;
}

function loadRegistry(param, cb) {
    var registry = loadProfile(regEnvironment);
    if (registry) {
        registryModule.model.loadData(registry.coreDB.provision, registry.environment, param, function (error, RegistryFromDB) {
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

        // added process.env.SOAJS_TEST to force load registry and bypass caching

        if (param.reload || process.env.SOAJS_TEST || !registry_struct[regEnvironment] || registry_struct[regEnvironment].profileOnly) {
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

var registryModule = {
    "init": function (modelName) {
        modelName = "mongo";
        if (process.env.SOAJS_SOLO && process.env.SOAJS_SOLO === "true") {
            models.local = require("./local.js");
            modelName = "local";
        }
        else {
            models.mongo = require("./mongo.js");
            modelName = "mongo";
        }
        models[modelName].init();
        registryModule.model = models[modelName];
    },

    "model": null,

    "profile": function (cb) {
        var registry = loadProfile(regEnvironment);
        return cb(registry);
    },
    "register": function (param, cb) {
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
    },
    "getCustom": function (envCode) {
        var env = envCode || regEnvironment;
        return registry_struct[env].custom;
    },
    "get": function (envCode) {
        var env = envCode || regEnvironment;
        return registry_struct[env];
    },
    "load": function (param, cb) {
        if (!param) param = {};
        param.reload = false;
        return getRegistry(param, function (err, reg) {
            return cb(reg);
        });
    },
    "reload": function (param, cb) {
        if (!param) param = {};
        param.reload = true;
        return getRegistry(param, function (err, reg) {
            return cb(err, reg);
        });
    },
    "loadByEnv": function (param, cb) {
        var registry = loadProfile(param.envCode.toLowerCase());
        if (registry) {
            return registryModule.model.loadRegistryByEnv({
                "envCode": param.envCode,
                "dbConfig": registry.coreDB.provision
            }, function (err, obj) {
                if (err || !obj)
                    return cb(err);
                build.buildRegistry(registry, obj, function (err) {
                    if (err) {
                        return cb(err);
                    }
                    return cb(null, registry);
                });
            });
        }
        else
            return cb(new Error("unable to find provision config information to connect to!"));
    },
    "loadOtherEnvControllerHosts": function (cb) {
        var registry = loadProfile(regEnvironment);
        if (registry) {
            return registryModule.model.loadOtherEnvHosts({
                "envCode": regEnvironment,
                "dbConfig": registry.coreDB.provision
            }, cb);
        }
        else
            return cb(new Error("unable to find provision config information to connect to!"));
    },
    "registerHost": function (param, registry, cb) {
        if (param.serviceIp) {
            var hostObj = {
                'env': registry.name.toLowerCase(),
                'name': param.serviceName,
                'ip': param.serviceIp,
                'hostname': os.hostname().toLowerCase(),
                'version': param.serviceVersion
            };
            if (param.serviceHATask)
                hostObj.serviceHATask = param.serviceHATask;

            registryModule.model.addUpdateServiceIP(registry.coreDB.provision, hostObj, function (error, registered) {
                if (error) {
                    throw new Error("Unable to register new host for service:" + error.message);
                }
                cb(registered);
            });
        }
        else {
            cb(false);
        }
    },
    "autoRegisterService": function (param, cb) {
        var controllerSRV = registry_struct[regEnvironment].services.controller;
        var serviceSRV = registry_struct[regEnvironment][param.what][param.name];
        if (!serviceSRV || !serviceSRV.newServiceOrHost) {
            return cb(null, false);
        }

        if (controllerSRV && controllerSRV.hosts && controllerSRV.hosts.latest && controllerSRV.hosts[controllerSRV.hosts.latest]) {
            async.each(controllerSRV.hosts[controllerSRV.hosts.latest],
                function (ip, callback) {
                    var requestOptions = {
                        'uri': 'http://' + ip + ':' + (controllerSRV.port + registry_struct[regEnvironment].serviceConfig.ports.maintenanceInc) + '/register'
                    };
                    requestOptions.qs = {
                        "name": param.name,
                        "group": serviceSRV.group,
                        "port": serviceSRV.port,
                        "ip": param.serviceIp,
                        "version": param.serviceVersion
                    };

                    if (param.what === "daemons") {
                        requestOptions.qs.type = "daemon";
                    }
                    else {
                        requestOptions.qs.type = "service";
                        requestOptions.qs.extKeyRequired = serviceSRV.extKeyRequired;
                        requestOptions.qs.requestTimeout = serviceSRV.requestTimeout;
                        requestOptions.qs.requestTimeoutRenewal = serviceSRV.requestTimeoutRenewal;
                    }

                    if (param.serviceHATask)
                        requestOptions.qs.serviceHATask = param.serviceHATask;

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
    }
};
module.exports = registryModule;