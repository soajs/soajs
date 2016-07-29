'use strict';

module.exports = {
    "name": "core_provision",
    "prefix": "",
    "servers": [
        {
            "host": "dataProxy-01",
            "port": 27017
        },
        {
            "host": "dataProxy-02",
            "port": 27017
        },
        {
            "host": "dataProxy-03",
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
        "maxPoolSize": 2,
        "readPreference": "secondaryPreferred",
        "replicaSet": "rs",
        "w": "majority",
        "ha": true
    },
    "extraParam": {
        "db": {
            "bufferMaxEntries": 0
        },
        "replSet": {
            "ha": true
        }
    }
};
