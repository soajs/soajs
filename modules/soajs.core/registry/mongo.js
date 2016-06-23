'use strict';
var fs = require('fs');
var Mongo = require('../../soajs.mongo');
var regFile = (process.env.SOAJS_PROFILE || __dirname + "/../../../profiles/single.js");
var mongo;

module.exports = {
    "init": function () {
    },
    "loadData": function (dbConfiguration, envCode, param, callback) {
        if (!mongo) {
            mongo = new Mongo(dbConfiguration);
        }
        mongo.findOne('environment', {'code': envCode.toUpperCase()}, function (error, envRecord) {
            if (error) {
                return callback(error);
            }
            var obj = {};
            if (envRecord && JSON.stringify(envRecord) !== '{}') {
                obj['ENV_schema'] = envRecord;
            }
            mongo.find('hosts', {'env': envCode}, function (error, hostsRecords) {
                if (error) {
                    return callback(error);
                }
                if (hostsRecords && Array.isArray(hostsRecords) && hostsRecords.length > 0) {
                    obj['ENV_hosts'] = hostsRecords;
                }
                mongo.find('services', function (error, servicesRecords) {
                    if (error) {
                        return callback(error);
                    }
                    if (servicesRecords && Array.isArray(servicesRecords) && servicesRecords.length > 0) {
                        obj['services_schema'] = servicesRecords;
                    }
                    mongo.find('daemons', function (error, daemonsRecords) {
                        if (error) {
                            return callback(error);
                        }
                        if (servicesRecords && Array.isArray(daemonsRecords) && daemonsRecords.length > 0) {
                            obj['daemons_schema'] = daemonsRecords;
                        }
                        return callback(null, obj);
                    });
                });
            });
        });
    },
    "registerNewService": function (dbConfiguration, serviceObj, collection, cb) {
        if (!mongo) {
            mongo = new Mongo(dbConfiguration);
        }
        mongo.findOne(collection, {
            'port': serviceObj.port,
            'name': {'$ne': serviceObj.name}
        }, function (error, record) {
            if (error) {
                return cb(error, null);
            }
            if (!record) {
                var s = {
                    '$set': {}
                };
                for (var p in serviceObj) {
                    if (Object.hasOwnProperty.call(serviceObj, p)) {
                        if (p !== "versions")
                            s.$set[p] = serviceObj[p];
                    }
                }
                if (serviceObj.versions) {
                    for (var pv in serviceObj.versions) {
                        if (Object.hasOwnProperty.call(serviceObj.versions, pv)) {
                            s.$set['versions.' + pv] = serviceObj.versions[pv];
                        }
                    }
                }
                mongo.update(collection, {'name': serviceObj.name}, s, {'upsert': true}, function (error) {
                    return cb(error);
                });
            }
            else {
                var error2 = new Error('Service port [' + serviceObj.port + '] is taken by another service [' + record.name + '].');
                return cb(error2);
            }
        });
    },
    "addUpdateServiceIP": function (dbConfiguration, hostObj, cb) {
        if (!mongo) {
            mongo = new Mongo(dbConfiguration);
        }
        mongo.update('hosts', hostObj, {'$set': hostObj}, {'upsert': true}, function (err) {
            if (err) {
                return cb(err, false);
            }
            return cb(null, true);
        });
    },
    "loadRegistryByEnv": function (param, cb) {
        if (!mongo) {
            mongo = new Mongo(param.dbConfig);
        }
        mongo.findOne('environment', {'code': param.envCode.toUpperCase()}, function (err, envRecord) {
            if (err) {
                return cb(err);
            }
            var obj = {};
            if (envRecord && JSON.stringify(envRecord) !== '{}') {
                obj['ENV_schema'] = envRecord;
                return cb(null, obj);
            }
        });
    },
    "loadOtherEnvHosts": function (param, cb) {
        if (!mongo) {
            mongo = new Mongo(param.dbConfig);
        }
        var pattern = new RegExp("controller", "i");
        var condition = (process.env.SOAJS_TEST) ? {'name': {'$regex': pattern}} : {
            'name': {'$regex': pattern},
            'env': {'$ne': param.envCode}
        };
        mongo.find('hosts', condition, cb);
    },
    "loadProfile": function (envFrom) {
        if (fs.existsSync(regFile)) {
            delete require.cache[require.resolve(regFile)];
            var regFileObj = require(regFile);
            if (regFileObj && typeof regFileObj === 'object') {
                var registry = {
                    "timeLoaded": new Date().getTime(),
                    "name": envFrom,
                    "environment": envFrom,
                    "profileOnly": true,
                    "coreDB": {
                        "provision": regFileObj
                    }
                };
                registry.coreDB.provision.registryLocation = {
                    "l1": "coreDB",
                    "l2": "provision",
                    "env": registry.environment
                };
                return registry;
            }
            else {
                throw new Error('Invalid profile path: ' + regFile);
            }
        }
        else {
            throw new Error('Invalid profile path: ' + regFile);
        }
        return null;
    }
};