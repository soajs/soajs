'use strict';

module.exports = {
    "name": "core_provision",
    "prefix": "",
    "servers": [
        {
            "host": "127.0.0.1",
            "port": 27017
        }
    ],
    "credentials": null,
    "streaming": {
        "batchSize" : 10000,
        "colName":{
            "batchSize" : 10000
        }
    },
    "URLParam": {
        "connectTimeoutMS": 0,
        "socketTimeoutMS": 0,
        "wtimeoutMS": 0,
        "bufferMaxEntries": 0
    },
    "extraParam": {
        "db": {
            "slaveOk": true,
            "native_parser": true
        }
    }
};
