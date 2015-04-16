'use strict';

var schema = {
    "dbs": {
        "clusters": {
            "cluster1": {
                "servers": {
                    "servers" : "",
                    "credentials": ""
                },
                "options": {
                    "URLParam":"",
                    "extraParam":""
                }
            }
        },
        "config": {
            "prefix": "",
            "session": {
                "cluster" : "cluster1",
                "name": "core_session",
                'store': {},
                "collection": "sessions",
                'stringify': false,
                'expireAfter': 1000 * 60 * 60 * 24 * 14 // 2 weeks
            }
        },
        "databases" : {
            "examples" : {
                "cluster": "cluster1",
                "tenantSpecific": true
            }
        }
    },
    "services": {
        "hosts" : {
          "urac" : {
              "ips" : []
          }
        },
        "serviceConfig": {}
    }
}

var dServers = require("../configurations/servers");
var dOptions = require("../configurations/options");

var registry = {
    "tenantMetaDB": {
        "urac": {
            "name": "#TENANT_NAME#_urac",
            "prefix": dServers.prefix,
            "servers": dServers.servers,
            "credentials": dServers.credentials,
            "URLParam": dOptions.URLParam,
            "extraParam": dOptions.extraParam
        }
    },

    "coreDB": {
        "session": {
            "name": "core_session",

            "prefix": dServers.prefix,

            "servers": dServers.servers,
            "credentials": dServers.credentials,
            "URLParam": dOptions.URLParam,
            "extraParam": dOptions.extraParam,

            'store': {},
            "collection": "sessions",
            'stringify': false,
            'expireAfter': 1000 * 60 * 60 * 24 * 14 // 2 weeks
        }
    },

    "serviceConfig": {
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
    "services": {
        "controller": {

            "maxPoolSize": 100,
            "authorization": true,

            "port": 4000,
            "host": "127.0.0.1",
            "requestTimeout": 30,
            "requestTimeoutRenewal": 0
        },
        "urac": {
            "extKeyRequired": true,
            "port": 4001,
            "host": "127.0.0.1"
        },
        "oauth": {
            "extKeyRequired": true,
            "port": 4002,
            "host": "127.0.0.1"
        },
        "dashboard": {
            "extKeyRequired": true,
            "port": 4003,
            "host": "127.0.0.1",
        },
        "agent": {
            "extKeyRequired": false,
            "port": 4004,
            "host": "127.0.0.1",
            "requestTimeoutRenewal": 10,
            "requestTimeout": 30
        },

        "example01": {
            "extKeyRequired": false,
            "port": 4010,
            "host": "127.0.0.1"
        },
        "example02": {
            "extKeyRequired": true,
            "port": 4011,
            "host": "127.0.0.1"
        },
        "example03": {
            "extKeyRequired": true,
            "port": 4012,
            "host": "127.0.0.1",
            "requestTimeoutRenewal": 2,
            "requestTimeout": 5
        },
        "example04": {
            "extKeyRequired": true,
            "port": 4013,
            "host": "127.0.0.1"
        },
        "contactUs": {
            "extKeyRequired": false,
            "port": 4015,
            "host": "127.0.0.1"
        }
    }
};

module.exports = registry;
