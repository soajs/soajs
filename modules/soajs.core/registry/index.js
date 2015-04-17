'use strict';
var fs = require('fs');

var regEnvironment = (process.env.SOAJS_ENV || "dev");
regEnvironment = regEnvironment.toLowerCase();
var registryDir = (process.env.SOAJS_REGDIR || __dirname + "/../../../");//__dirname);
var projectPath = registryDir + 'profiles/' + (process.env.SOAJS_PRJ || 'default/');
var envPath = projectPath + 'environments/';
var regFile = envPath + regEnvironment.toLowerCase() + '.js';

var registry_struct = {};
registry_struct[regEnvironment] = null;

// TODO: Delete this variable after implementation

var _hardcode = {
    "ENV_hosts": [
        {
            "env": "dev",
            "name": "controller",
            "ip": "127.0.0.1"
        },
        {
            "env": "dev",
            "name": "example01",
            "ip": "127.0.0.1"
        }
    ],
    "services_schema": [
        {
            "name": "example01",
            "extKeyRequired": false,
            "port": 4010,
            "apis": []
        }
    ],
    "ENV_schema": {
        "dbs": {
            "clusters": {
                "cluster1": {
                    "servers": [
                        {
                            "host": "127.0.0.1",
                            "port": 27017
                        }
                    ],
                    "credentials": null,
                    "URLParam": {
                        "connectTimeoutMS": 0,
                        "socketTimeoutMS": 0,
                        "maxPoolSize": 5,
                        "wtimeoutMS": 0,
                        "slaveOk": true
                    },
                    "extraParam": {
                        "db": {
                            "native_parser": true
                        },
                        "server": {
                            "auto_reconnect": true
                        }
                    }
                }
            },
            "config": {
                "prefix": "",
                "session": {
                    "cluster": "cluster1",
                    "name": "core_session",
                    'store': {},
                    "collection": "sessions",
                    'stringify': false,
                    'expireAfter': 1000 * 60 * 60 * 24 * 14 // 2 weeks
                }
            },
            "databases": {
                "examples": {
                    "cluster": "cluster1",
                    "tenantSpecific": true
                }
            }
        },
        "services": {
            "controller": {
                "maxPoolSize": 100,
                "authorization": true,
                "requestTimeout": 30,
                "requestTimeoutRenewal": 0
            },
            "config": {
                "awareness": {
                    "healthCheckInterval": 1000 * 5, // 5 seconds
                    "autoRelaodRegistry": 1000 * 60 * 5 // 5 minutes
                },
                "agent": {
                    "topologyDir": "/opt/soajs/"
                },
                "key": {
                    "algorithm": 'aes256',
                    "password": 'soajs key lal massa'
                },
                "logger": { //ATTENTION: this is not all the properties for logger
                    "src": true,
                    "level": "debug"
                },
                "cors": {
                    "enabled": true,
                    "origin": '*',
                    "credentials": 'true',
                    "methods": 'GET,HEAD,PUT,PATCH,POST,DELETE',
                    "headers": 'key,soajsauth,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type',
                    "maxage": 1728000
                },
                "oauth": {
                    "grants": ['password', 'refresh_token'],
                    "debug": false
                },
                "ports": {"controller": 4000, "maintenanceInc": 1000, "randomInc": 100},
                "cookie": {"secret": "this is a secret sentence"},
                "session": {
                    "name": "soajsID",
                    "secret": "this is antoine hage app server",
                    "cookie": {"path": '/', "httpOnly": true, "secure": false, "domain": "soajs.com", "maxAge": null},
                    "resave": false,
                    "saveUninitialized": false
                }
            }
        }
    }
};

var build = {
    "metaAndCoreDB": function (STRUCT) {
        var metaAndCoreDB = {"metaDB": {}, "coreDB": {}};
        var dbName = null;
        for (dbName in STRUCT.dbs.databases) {
            if (STRUCT.dbs.databases.hasOwnProperty(dbName)) {
                var dbRec = STRUCT.dbs.databases[dbName];
                var dbObj = null;
                if (dbRec.cluster && STRUCT.dbs.clusters[dbRec.cluster]) {
                    dbObj = {
                        "prefix": STRUCT.dbs.config.prefix,
                        "servers": STRUCT.dbs.clusters[dbRec.cluster].servers,
                        "credentials": STRUCT.dbs.clusters[dbRec.cluster].credentials,
                        "URLParam": STRUCT.dbs.clusters[dbRec.cluster].URLParam,
                        "extraParam": STRUCT.dbs.clusters[dbRec.cluster].extraParam
                    }
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
        return metaAndCoreDB;
    },
    "sessionDB": function (STRUCT) {
        var sessionDB = null
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
        return sessionDB;
    },
    "allServices": function (STRUCT, servicesObj) {
        var i = 0;
        for (i = 0; i < STRUCT.length; i++) {
            servicesObj[STRUCT[i].name] = {
                "extKeyRequired": STRUCT[i].extKeyRequired,
                "port": STRUCT[i].port,
                "requestTimeoutRenewal": STRUCT[i].requestTimeoutRenewal || null,
                "requestTimeout": STRUCT[i].requestTimeoutRenewal || null
            };
        }
    },
    "servicesHosts": function (STRUCT, servicesObj) {
        var i = 0;
        for (i = 0; i < STRUCT.length; i++) {
            if (STRUCT[i].env === regEnvironment) {
                if (servicesObj[STRUCT[i].name]) {
                    if (!servicesObj[STRUCT[i].name].hosts)
                        servicesObj[STRUCT[i].name].hosts = [];
                    if (servicesObj[STRUCT[i].name].hosts.indexOf(STRUCT[i].ip) === -1)
                        servicesObj[STRUCT[i].name].hosts.push(STRUCT[i].ip)
                }
            }
        }
    },
    "service": function (STRUCT, serviceName) {
        var serviceObj = null;
        var i = 0;
        for (i = 0; i < STRUCT.length; i++) {
            if (STRUCT[i].name) {
                serviceObj = {
                    "extKeyRequired": STRUCT[i].extKeyRequired,
                    "port": STRUCT[i].port,
                    "requestTimeoutRenewal": STRUCT[i].requestTimeoutRenewal || null,
                    "requestTimeout": STRUCT[i].requestTimeoutRenewal || null
                };
                return serviceObj;
            }
        }
        return serviceObj;
    },
    "controllerHosts": function (STRUCT, controllerObj) {
        var i = 0;
        for (i = 0; i < STRUCT.length; i++) {
            if (STRUCT[i].name === "controller" && STRUCT[i].env === regEnvironment) {
                if (!controllerObj.hosts)
                    controllerObj.hosts = [];
                if (controllerObj.hosts.indexOf(STRUCT[i].ip) === -1)
                    controllerObj.hosts.push(STRUCT[i].ip)
            }
        }
    }
};

function deepFreeze(o) {
    var prop, propKey = null;
    Object.freeze(o); // First freeze the object.
    for (propKey in o) {
        if (o.hasOwnProperty(propKey)) {
            prop = o[propKey];
            if (!prop || !o.hasOwnProperty(propKey) || (typeof prop !== "object") || Object.isFrozen(prop)) {
                // If the object is on the prototype, not an object, or is already frozen,
                // skip it. Note that this might leave an unfrozen reference somewhere in the
                // object if there is an already frozen object containing an unfrozen object.
                continue;
            }
            deepFreeze(prop); // Recursively call deepFreeze.
        }
    }
}

function loadRegistry(param, cb) {
    if (fs.existsSync(regFile)) {
        delete require.cache[require.resolve(regFile)];
        var regFileObj = require(regFile);
        if (regFileObj && typeof regFileObj === 'object') {
            var registry = {
                "projectPath": projectPath,
                "name": regFileObj.name,
                "version": regFileObj.version,
                "environment": regFileObj.environment,
                "coreDB": {
                    "provision": regFileObj.provisionDB
                }
            };

            //TODO: use registry.coreDB.provision to connect to DB and load the following:
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

            var randomInt = function (low, high) {
                return Math.floor(Math.random() * (high - low) + low);
            };

            var metaAndCoreDB = build.metaAndCoreDB(_hardcode.ENV_schema);
            registry["tenantMetaDB"] = metaAndCoreDB.metaDB;
            registry["serviceConfig"] = _hardcode.ENV_schema.services.config;
            registry["coreDB"]["session"] = build.sessionDB(_hardcode.ENV_schema);
            var coreDBName = null;
            for (coreDBName in metaAndCoreDB.coreDB) {
                if (metaAndCoreDB.coreDB.hasOwnProperty((coreDBName))) {
                    registry["coreDB"][coreDBName] = metaAndCoreDB.coreDB[coreDBName];
                }
            }
            registry["services"] = {
                "controller": {
                    "maxPoolSize": _hardcode.ENV_schema.services.controller.maxPoolSize,
                    "authorization": _hardcode.ENV_schema.services.controller.authorization,
                    "port": _hardcode.ENV_schema.services.config.ports.controller,
                    "requestTimeout": _hardcode.ENV_schema.services.controller.requestTimeout,
                    "requestTimeoutRenewal": _hardcode.ENV_schema.services.controller.requestTimeoutRenewal
                }
            };
            if (param.serviceName === "controller") {
                build.allServices(_hardcode.services_schema, registry["services"]);
                build.servicesHosts(_hardcode.ENV_hosts, registry["services"]);
            }
            else {
                var serviceObj = build.service(_hardcode.services_schema, param.serviceName);
                if (serviceObj) {
                    registry["services"][param.serviceName] = serviceObj;
                }
                else {
                    registry["services"][param.serviceName] = {
                        "extKeyRequired": false,
                        "port": param.designatedPort || randomInt(_hardcode.ENV_schema.services.config.ports.controller + _hardcode.ENV_schema.services.config.ports.randomInc, _hardcode.ENV_schema.services.config.ports.controller + _hardcode.ENV_schema.services.config.ports.maintenanceInc)
                    }
                }
                if (param.awareness) {
                    build.controllerHosts(_hardcode.ENV_hosts, registry["services"].controller);
                }
            }
            //TODO: add service ip to ENV_hosts

            console.log(registry);

            registry_struct[regEnvironment] = registry;
        }
    }
    else
        throw new Error('Invalid profile path: ' + regFile);

    return cb();
}

exports.getRegistry = function (param, cb) {
    try {
        if (param.reload || !registry_struct[regEnvironment]) {
            loadRegistry(param, function () {
                return cb(registry_struct[regEnvironment]);
            });
        }
        else
            return cb(registry_struct[regEnvironment]);
    } catch (e) {
        throw new Error('Failed to get registry: ' + e.message);
    }
};