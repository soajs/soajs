'use strict';
var utils = require('../../lib').utils;
var merge = require('merge');

function mergeCommonFields(params, commonFields) {
    var _params = utils.cloneObj(params);
    delete _params.commonFields;

    // Extend _params with commonFields
    params.commonFields.forEach(function (field) {
        _params[field] = commonFields[field];
    });

    return _params;
}

var castFunctions = {
    
    'string': function castToString(value) {
        return value.toString();
    },
    'integer': function castToInt(value) {
        return parseInt(value, 10);
    },
    'number': function castToNumber(value) {
        return parseFloat(value);
    },
    'boolean': function castToBoolean(value) {
        return (value.toString() === 'true');
    },
    'regexp': function castToRegEx(value) {
        return new RegExp(value);
    },
    'array': function castToArray(arr, cfg) {
        cfg = cfg.items;
        if (cfg) {
            for (var i = 0; i < arr.length; i++) {
                if (cfg.type) {
                    if (cfg.type === 'array' && cfg.items) {
                        castFunctions['array'](arr[i], cfg.items);
                    }
                    else if (cfg.type === 'object' && cfg) {
                        castFunctions['object'](arr[i], cfg);
                    }
                    else {
                        arr[i] = castFunctions[cfg.type](arr[i]);
                    }
                }
            }
        }
    },
    'object': function castToObject(obj, cfg) {
        var objCfg = null;
        if (cfg && (cfg.properties || (cfg.additionalProperties && typeof(cfg.additionalProperties) === 'object') )) {
            objCfg = cfg.properties || cfg.additionalProperties;
            for (var key in obj) {
                if (Object.hasOwnProperty.call(obj, key)) {
                    if (objCfg[key].type === 'array') {
                        castFunctions['array'](obj[key], objCfg[key].items);
                    }
                    else if (objCfg[key].type === 'object' || objCfg[key].patternProperties) {
                        castFunctions['object'](obj[key], objCfg[key]);
                    }
                    else if (objCfg[key].type) {
                        obj[key] = castFunctions[objCfg[key].type](obj[key]);
                    }
                }
            }
        }
        if (cfg && (cfg.patternProperties && typeof(cfg.patternProperties) === 'object')) {
            objCfg = cfg.patternProperties;
            var patterns = Object.keys(objCfg);
            for (var i = 0; i < patterns.length; i++) {
                var regexp = new RegExp(patterns[i]);
                for (var key2 in obj) {
                    if (Object.hasOwnProperty.call(obj, key2)) {
                        if (regexp.test(key2)) {
                            castFunctions['object'](obj[key2], objCfg[patterns[i]]);
                        }
                    }
                }
            }
        }
    }
};

function castType(value, type, cfg) {
    try {
        let retValue = castFunctions[type](value, cfg);
        return typeof retValue !== 'undefined' && retValue !== null? retValue : value;
    }catch(error){
        console.log(error)
        return value;
    }
}

module.exports = {
    mapFormatAndValidate: function (obj, cb) {
        var sources = {};

        var sourceProblem = false;
        if (!obj.req || typeof obj.req !== "object") {
            sourceProblem = true;
        }
        else {
            for (var i = 0; i < obj.inputmaskSrc.length; i++) {
                if (Object.hasOwnProperty.call(obj.req, obj.inputmaskSrc[i])) {
                    sources[obj.inputmaskSrc[i]] = utils.cloneObj(obj.req[obj.inputmaskSrc[i]]);
                    if (typeof sources[obj.inputmaskSrc[i]] !== "object") {
                        sourceProblem = true;
                    }
                }
                else {
                    sourceProblem = true;
                }
            }
        }
        if (sourceProblem) {
            return cb({"code": 171, "msg": "request does not have all the sources needed: " + obj.inputmaskSrc});
        }

        sources['servicesConfig'] = (obj.req.soajs && obj.req.soajs.servicesConfig) ? obj.req.soajs.servicesConfig : {};
        sources['clientIP'] = ( obj.req.getClientIP && obj.req.getClientIP() ) || {};
        sources['session'] = (obj.req.soajs && obj.req.soajs.session) ? obj.req.soajs.session.getSERVICE() : {};

        var paramsLocalConfig = obj.config.schema[obj.apiName];
        var paramsServiceConfigAPI = null;
        var paramsServiceConfigCommonFields = null;
        if (obj.req.soajs.servicesConfig && obj.req.soajs.servicesConfig[obj.config.serviceName] && obj.req.soajs.servicesConfig[obj.config.serviceName].SOAJS && obj.req.soajs.servicesConfig[obj.config.serviceName].SOAJS.IMFV && obj.req.soajs.servicesConfig[obj.config.serviceName].SOAJS.IMFV.schema) {
            paramsServiceConfigAPI = obj.req.soajs.servicesConfig[obj.config.serviceName].SOAJS.IMFV.schema[obj.apiName];
            paramsServiceConfigCommonFields = obj.req.soajs.servicesConfig[obj.config.serviceName].SOAJS.IMFV.schema.commonFields;
        }
        var params = paramsLocalConfig;
        if (paramsServiceConfigAPI) {
            params = merge.recursive(true, paramsLocalConfig, paramsServiceConfigAPI);
        }

        if (utils.validProperty(params, 'commonFields')) {
            var commonFields = obj.config.schema.commonFields;
            if (paramsServiceConfigCommonFields)
                commonFields = merge.recursive(true, commonFields, paramsServiceConfigCommonFields);
            params = mergeCommonFields(params, commonFields);
        }

        var data = {};
        var err = null;
        var errors = [];

        for (var param in params) {
            if (Object.hasOwnProperty.call(params, param)) {
                var force = false;
                var fetched;
                var paramConfig = params[param];
                if (params[param].source && params[param].source.some(function (source) {
                        var path = source.split("."), pathLength = path.length, traversed = sources;
                        if (path[0] === 'query') {
                            force = true;
                        }
                        var next = path.shift();
                        while (next) {
                            if (Object.hasOwnProperty.call(traversed, next)) {
                                traversed = traversed[next];
                                next = path.shift();
                            }
                            else {
                                return;
                            }
                        }
                        if (pathLength === 1) {
                            if (Object.hasOwnProperty.call(traversed, param)) {
                                traversed = traversed[param];
                            } else {
                                return;
                            }
                        }

                        fetched = traversed;
                        return fetched != null;
                    })) {
                    data[param] = fetched;
                    var validation;
                    var type = paramConfig.validation.type;

                    //apply type casting if headers content-type is not JSON, otherwise inputs are received as strings
                    if (force || !obj.req.headers['content-type'] || obj.req.headers['content-type'].indexOf('application/json') === -1) {
                        data[param] = castType(data[param], type, paramConfig.validation);
                    }

                    if (utils.validProperty(paramConfig, "validation")) {
                        if (!(validation = obj.configValidator.validate(data[param], paramConfig.validation)).valid) {
                            if (!err) {
                                err = {};
                            }
                            if (err[173]) {
                                err[173] += ", " + param;
                            } else {
                                err[173] = "Validation failed for field: " + param;
                                validation.errors.forEach(function (validationErr) {
                                    err[173] += " -> The parameter '" + param + "' failed due to: " + validationErr.stack;
                                });
                            }
                        }
                    }
                }
                else {
                    if (Object.hasOwnProperty.call(paramConfig, "default")) {
                        data[param] = paramConfig.default;
                    } else {
                        if (!utils.validProperty(paramConfig, "required") || !paramConfig.required) {
                            continue;
                        }
                        if (!err) {
                            err = {};
                        }
                        if (err[172]) {
                            err[172] += ", " + param;
                        } else {
                            err [172] = "Missing required field: " + param;
                        }
                    }
                }
            }
        }
        if (err) {
            for (var e in err) {
                if (Object.hasOwnProperty.call(err, e)) {
                    errors.push({"code": Number(e), "msg": err[e]});
                }
            }
        }
        if (errors.length === 0) {
            errors = null;
        }
        return cb(errors, data);
    }
};