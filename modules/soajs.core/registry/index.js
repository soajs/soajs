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
    "tenantMetaDB" : {},
    "serviceConfig" : {
        "awareness": {
            "healthCheckInterval": 1000 * 2, // 2 seconds
            "autoRelaodRegistry" : 1000 * 60 * 5 // 5 minutes
        },
        "agent": {
            "topologyDir": "/opt/soajs/"
        },
        "key": {
            "algorithm": 'aes256',
            "password": 'soajs key lal massa'
        },
        "logger": {
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
        "maintenancePortInc": 1000,
        "cookie": {"secret": "this is a secret sentence"},
        "session": {
            "name": "soajsID",
            "secret": "this is antoine hage app server",
            "cookie": {"path": '/', "httpOnly": true, "secure": false, "domain": "soajs.com", "maxAge": null},
            "resave": false,
            "saveUninitialized": false
        }
    },
    "coreDB" :{
        "session" : {
            "name": "core_session",
            "prefix": "",
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
            },
            'store': {},
            "collection": "sessions",
            'stringify': false,
            'expireAfter': 1000 * 60 * 60 * 24 * 14 // 2 weeks
        }
    },
    "services" : {
        "controller": {
            "maxPoolSize": 100,
            "authorization": true,
            "port": 4000,
            "requestTimeout": 30,
            "requestTimeoutRenewal": 0
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

function loadRegistry(serviceName, apiList, reload, awareness, cb) {
    if (fs.existsSync(regFile)) {
        delete require.cache[require.resolve(regFile)];
        var regFileObj = require(regFile);
        if (regFileObj && typeof regFileObj === 'object') {
            var registry = {
                "name": regFileObj.name,
                "version": regFileObj.version,
                "environment": regFileObj.environment,
                "projectPath": projectPath,
                "coreDB": {
                    "provision": regFileObj.provisionDB,
                    "session" : _hardcode.coreDB.session
                },
                "tenantMetaDB" :_hardcode.tenantMetaDB,
                "serviceConfig" : _hardcode.serviceConfig,
                "services" : _hardcode.services

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

            //deepFreeze(registry);

            registry_struct[regEnvironment] = registry;
        }
    }
    else
        throw new Error('Invalid profile path: ' + regFile);

    return cb();
}

exports.getRegistry = function (serviceName, apiList, reload, awareness, cb) {
    try {
        if (reload || !registry_struct[regEnvironment]) {
            loadRegistry(serviceName, apiList, reload, awareness, function () {
                return cb(registry_struct[regEnvironment]);
            });
        }
        else
            return cb(registry_struct[regEnvironment]);
    } catch (e) {
        throw new Error('Failed to get registry: ' + e.message);
    }
};