'use strict';

module.exports = {
    "URLParam": {
        "replicaSet": "rs",
        "ssl": false,
        "connectTimeoutMS": 0,
        "socketTimeoutMS": 0,
        "maxPoolSize": 5,
        "w": "majority",
        "wtimeoutMS": 0,
        "journal": false,
        "fsync": false,
        "authSource": null,
        "slaveOk": false,
        "readPreference": "primary",
        "readPreferenceTags": "TAG"
    },
    "extraParam": {
        "db": {
            "w": "majority",
            "wtimeout": 0,
            "fsync": false,
            "journal": false,
            "readPreference": "primary",
            "native_parser": true,
            "forceServerObjectId": false,
            "pkFactory": {},
            "serializeFunctions": false,
            "raw": false,
            "recordQueryStats": false,
            "retryMiliSeconds": 5000,
            "numberOfRetries": 5,
            "bufferMaxEntries": -1
        },
        "server": {
            "readPreference": "primary",
            "ssl": false,
            "slaveOk": false,
            "poolSize": 1,
            "socketOptions": {"noDelay": false, "keepAlive": 1, "connectTimeoutMS": 0, "socketTimeoutMS": 0},
            "logger": null,
            "auto_reconnect": true,
            "disableDriverBSONSizeCheck": false
        },
        "replSet": {
            "ha": true,
            "haInterval": 2000,
            "reconnectWait": 1000,
            "retries": 30,
            "rs_name": "rs",
            "socketOptions": null,
            "readPreference": "primary",
            "strategy": null,
            "secondaryAcceptableLatencyMS": 15,
            "connectArbiter": false

        },
        "mongos": {
            "socketOptions": null,
            "ha": true,
            "haInterval": 2000
        }
    }
};