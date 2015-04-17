'use strict';

var registry = require('./registry/index');
exports.getRegistry = function (param, cb) {
    if (!param) param = {};
    param.reload = false;
    return registry.getRegistry(param, cb);
};
exports.reloadRegistry = function (param, cb) {
    if (!param) param = {};
    param.reload = false;
    param.designatedPort = null;
    return registry.getRegistry(param, null, cb);
};
exports.getLogger = require('./logger/index');
exports.meta = require('./meta/index');
exports.error = require('./error/index');
exports.key = require('./key/index');
exports.provision = require('./provision/index');
exports.security = require('./security/index');
exports.getMail = require('./mail/index');
exports.validator = require('./validator/index');
exports.getHostIp = function () {
    var os = require('os');
    var ifaces = os.networkInterfaces();
    var ifnameLookupSequence = ["eth0", "en0", "eth1", "en1"];
    var ips = []
    Object.keys(ifaces).forEach(function (ifname) {
        ifaces[ifname].forEach(function (iface) {
            if ('IPv4' !== iface.family || iface.internal !== false) {
                // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
                return;
            }
            ips[ifname]=iface.address;
        });
    });
    for (var i=0;i<ifnameLookupSequence.length;i++){
        if (ips[ifnameLookupSequence[i]])
        return {"result":true,"ip":ips[ifnameLookupSequence[i]]};
    }
    return {"result":false,"ips":ips,"n":ifnameLookupSequence};
};