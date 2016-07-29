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
        "maxPoolSize": 2
    },
    "extraParam": {
        "db": {
            "bufferMaxEntries": 0
        }
    }
};
