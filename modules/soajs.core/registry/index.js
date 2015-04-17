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
    "tenantMetaDB": {},
    "serviceConfig": {
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
    },
    "coreDB": {
        "session": {
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
    "services": {
        "controller": {
            "maxPoolSize": 100,
            "authorization": true,
            "port": 4000,
            "requestTimeout": 30,
            "requestTimeoutRenewal": 0,
            "hosts": []
        },
        "example01": {
            "extKeyRequired": false,
            "port": 4040,
            "hosts": ["127.0.0.1"]
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

            registry["coreDB"]["session"] = _hardcode.coreDB.session;
            registry["tenantMetaDB"] = _hardcode.tenantMetaDB;
            registry["serviceConfig"] = _hardcode.serviceConfig;
            registry["services"] = _hardcode.services;

            var randomInt = function (low, high) {
                return Math.floor(Math.random() * (high - low) + low);
            };

            if (!registry["services"][param.serviceName]) {
                registry["services"][param.serviceName] = {
                    "extKeyRequired": false,
                    "port": param.designatedPort || randomInt(_hardcode.serviceConfig.ports.controller + _hardcode.serviceConfig.ports.randomInc, _hardcode.serviceConfig.ports.controller + _hardcode.serviceConfig.ports.maintenanceInc)
            }
        }
//console.log (registry);
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