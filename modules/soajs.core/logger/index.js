'use strict';
var bunyan = require('bunyan');
var _log = null;
var lib = require("../../../lib");

/* Logger Component
 *
 * {
 *  "name": "",
 *  "stream": process.stdout - path_to_file,
 *  "src": true,
 *  "level": ["debug","trace","info","error", "warn", "fatal"],
 *  "streams":[
 *    {
 *      "level": ["debug","trace","info","error", "warn", "fatal"],
 *      "stream": process.stdout - path_to_file
 *    }
 *    ...
 *  ]
 * }
 *
 * REF: https://www.npmjs.com/package/bunyan
 */
module.exports = function getLogger(name, config) {
    if(!_log) {
        var configClone = lib.utils.cloneObj(config);
        configClone["name"] = name;

        if(config.formatter && Object.keys(config.formatter).length > 0){
            var bformat = require('bunyan-format');
            var formatOut = bformat(config.formatter);
            configClone['stream'] = formatOut;
            delete configClone.formatter;
        }

        _log = new bunyan.createLogger(configClone);
    }
    return _log;
};

module.exports = function getLog() {
    if (_log) {
        return _log;
    }
    return null;
};