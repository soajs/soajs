'use strict';
var fs = require('fs');
var Mongo = require('../../soajs.mongo');
var regFile = (process.env.SOAJS_PROFILE || __dirname + "/../../../profiles/single.js");
var mongo;
var environmentCollectionName = 'environment';
var hostCollectionName = 'hosts';
var servicesCollectionName = 'services';
var daemonsCollectionName = 'daemons';

function initMongo(dbConfiguration) {
    if (!mongo) {
        mongo = new Mongo(dbConfiguration);

        mongo.ensureIndex(environmentCollectionName, {code: 1}, {unique: true}, function (err, result) {
        });
        mongo.ensureIndex(hostCollectionName, {env: 1}, function (err, result) {
        });
        mongo.ensureIndex(hostCollectionName, {name: 1, env: 1}, function (err, result) {
        });
        mongo.ensureIndex(servicesCollectionName, {name: 1}, function (err, result) {
        });
        mongo.ensureIndex(servicesCollectionName, {port: 1, name: 1}, {unique: true}, function (err, result) {
        });
    }
}

module.exports = {
    "init": function () {
    },
    "loadData": function (dbConfiguration, envCode, param, callback) {
        initMongo(dbConfiguration);
        mongo.findOne(environmentCollectionName, {'code': envCode.toUpperCase()}, function (error, envRecord) {
            if (error) {
                return callback(error);
            }
            var obj = {};
            if (envRecord && JSON.stringify(envRecord) !== '{}') {
                obj['ENV_schema'] = envRecord;
            }
            mongo.find(hostCollectionName, {'env': envCode}, function (error, hostsRecords) {
                if (error) {
                    return callback(error);
                }
                if (hostsRecords && Array.isArray(hostsRecords) && hostsRecords.length > 0) {
                    obj['ENV_hosts'] = hostsRecords;
                }
                mongo.find(servicesCollectionName, function (error, servicesRecords) {
                    if (error) {
                        return callback(error);
                    }
                    if (servicesRecords && Array.isArray(servicesRecords) && servicesRecords.length > 0) {
                        obj['services_schema'] = servicesRecords;
                    }
                    mongo.find(daemonsCollectionName, function (error, daemonsRecords) {
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
        initMongo(dbConfiguration);
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
        initMongo(dbConfiguration);
        if (hostObj) {
            var criteria = {
                'env': hostObj.env,
                'name': hostObj.name,
                'version': hostObj.version
            };
            if (hostObj.serviceHATask) {
                criteria.serviceHATask = hostObj.serviceHATask;
            }
            else {
                criteria.ip = hostObj.ip;
                criteria.hostname = hostObj.hostname;
            }
            mongo.update(hostCollectionName, hostObj, {'$set': hostObj}, {'upsert': true}, function (err) {
                if (err) {
                    return cb(err, false);
                }
                return cb(null, true);
            });
        }
        return cb(null, false);
    },
    "loadRegistryByEnv": function (param, cb) {
        initMongo(param.dbConfig);
        mongo.findOne(environmentCollectionName, {'code': param.envCode.toUpperCase()}, function (err, envRecord) {
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
        initMongo(param.dbConfig);
        var pattern = new RegExp("controller", "i");
        var condition = (process.env.SOAJS_TEST) ? {'name': {'$regex': pattern}} : {
            'name': {'$regex': pattern},
            'env': {'$ne': param.envCode}
        };
        mongo.find(hostCollectionName, condition, cb);
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