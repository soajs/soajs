'use strict';

var drivers = require('soajs.core.drivers');

module.exports = {
    "init" : function (param){},
    "getControllerEnvHost" : function (env, v, cb){
        var options = {
            "params" : {
                "serviceNane": 'controller',
                "version": version,
                "env": env
            }
        }

        drivers.getControllerEnvHost(options, cb);
    }
};