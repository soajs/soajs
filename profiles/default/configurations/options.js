'use strict';

module.exports = {
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
};