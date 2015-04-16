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

function loadRegistry(serviceName, apiList, cb) {
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
                    "provision": regFileObj.provisionDB
                }
            };

            //TODO: use registry.coreDB.provision to connect to DB and load the following:
            /**
             * ENV_schema:
             * --------------
             * registry.tenantMetaDB    //tenantSpecific true
             * registry.serviceConfig
             * registry.coreDB.session
             * registry.coreDB          //tenantSpecific false
             * services.controller      // without the hosts array
             *
             * services_schema:
             * -------------------
             * services.SERVICENAME     // if in service
             * services.EVERYSERVICE    // if in controller only and awareness is true
             *
             *  ENV_hosts:
             *  -------------
             *  services.controller.hosts   // if in service and awareness is true
             *  services.EVERYSERVICE.hosts // if in controller only and awareness is true
             *
             */

            deepFreeze(registry);

            registry_struct[regEnvironment] = registry;
        }
    }
    else
        throw new Error('Invalid profile path: ' + regFile);

    return cb();
}

exports.getRegistry = function (serviceName, apiList, reload, cb) {
    try {
        if (reload || !registry_struct[regEnvironment]) {
            loadRegistry(serviceName, apiList, function () {
                return cb(registry_struct[regEnvironment]);
            });
        }
        else
            return cb(registry_struct[regEnvironment]);
    } catch (e) {
        throw new Error('Failed to get registry: ' + e.message);
    }
};