'use strict';

/**
 *
 * @type {{getServiceConf: getServiceConf}}
 */
module.exports = {
    getServiceConf : function (service, registry){
        var serviceConf = null;
        if (service && registry && registry.services && registry.services[service] && registry.services[service].port) {
            serviceConf = {};
            serviceConf.info =  registry.services[service];
            serviceConf._conf = registry.serviceConfig;
        }

        return serviceConf;
    }
};