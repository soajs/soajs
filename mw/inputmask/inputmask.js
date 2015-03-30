'use strict';
var utils = require('../../lib').utils;

function mergeCommonFields(params, commonFields) {
	var _params = utils.cloneObj(params);
	delete _params.commonFields;

	// Extend _params with commonFields
	params.commonFields.forEach(function(field) {
		_params[field] = commonFields[field];
	});

	return _params;
}

function castType(value, type, cfg) {
	switch(type) {
		case 'string':
		case 'integer':
		case 'number':
		case 'boolean':
		case 'regexp':
			value = castTypeSimpleData(value, type);
			break;
		case 'array':
			doArray(value, cfg.items);
			break;
		case 'object':
			doObject(value, cfg);
			break;
		default:
			break;
	}
	return value;

	function doArray(arr, cfg) {
		if(cfg) {
			for(var i = 0; i < arr.length; i++) {
				if(cfg.type) {
					if(cfg.type === 'array' && cfg.items) {
						doArray(arr[i], cfg.items);
					}
					else if(cfg.type === 'object' && cfg) {
						doObject(arr[i], cfg);
					}
					else {
						arr[i] = castTypeSimpleData(arr[i], cfg.type);
					}
				}
			}
		}
	}

	function doObject(obj, cfg) {
		var objCfg =null;
		if(cfg && (cfg.properties || (cfg.additionalProperties && typeof(cfg.additionalProperties) === 'object') )) {
			objCfg = cfg.properties || cfg.additionalProperties;
			for(var key in obj) {
				if(obj.hasOwnProperty(key)) {
					if(objCfg[key].type === 'array') {
						doArray(obj[key], objCfg[key].items);
					}
					else if(objCfg[key].type === 'object' || objCfg[key].patternProperties) {
						doObject(obj[key], objCfg[key]);
					}
					else if(objCfg[key].type) {
						obj[key] = castTypeSimpleData(obj[key], objCfg[key].type);
					}
				}
			}
		}
		if(cfg && (cfg.patternProperties && typeof(cfg.patternProperties) === 'object')) {
			objCfg = cfg.patternProperties;
			var patterns = Object.keys(objCfg);
			for(var i =0; i < patterns.length; i++){
				var regexp = new RegExp(patterns[i]);
				for(var key2 in obj){
					if(obj.hasOwnProperty(key2)){
						if(regexp.test(key2)){
							doObject(obj[key2], objCfg[patterns[i]]);
						}
					}
				}
			}
		}
	}

	function castTypeSimpleData(value, type) {
		var castedValue = null;
		try {
			switch(type) {
				case 'string':
					castedValue = value.toString();
					break;
				case 'integer':
					castedValue = parseInt(value, 10);
					break;
				case 'number':
					castedValue = parseFloat(value);
					break;
				case 'boolean':
					castedValue = (value.toString() === 'true');
					break;
				case 'regexp':
					castedValue = new RegExp(value);
					break;
				default:
					break;
			}
		} catch(ex) {
			castedValue = value;
		}
		return (castedValue !== null) ? castedValue : value;
	}
}

module.exports = {
	mapFormatAndValidate: function(obj, cb) {
		var sources = {};

		var sourceProblem = false;
		if(!obj.req || typeof obj.req !== "object") {
			sourceProblem = true;
		}
		for(var i = 0; i < obj.inputmaskSrc.length; i++) {
			if(obj.req.hasOwnProperty(obj.inputmaskSrc[i])) {
				sources[obj.inputmaskSrc[i]] = utils.cloneObj(obj.req[obj.inputmaskSrc[i]]);
				if(typeof sources[obj.inputmaskSrc[i]] !== "object") {
					sourceProblem = true;
				}
			}
			else {
				sourceProblem = true;
			}
		}
		if(sourceProblem) {
			return cb({"code": 171, "msg": "request does not have all the sources needed: " + obj.inputmaskSrc});
		}

		sources['servicesConfig'] = (obj.req.soajs && obj.req.soajs.servicesConfig) ? obj.req.soajs.servicesConfig : {};
		sources['clientIP'] = ( obj.req.getClientIP && obj.req.getClientIP() ) || {};
		sources['session'] = (obj.req.soajs && obj.req.soajs.session) ? obj.req.soajs.session.getSERVICE() : {};

		var params = obj.config.schema[obj.apiName];

		if(utils.validProperty(params, 'commonFields')) {
			params = mergeCommonFields(params, obj.config.schema.commonFields);
		}

		var data = {};
		var err = null;
		var errors = [];

		for(var param in params) {
			if(params.hasOwnProperty(param)) {
				var fetched;
				var paramConfig = params[param];
				if(params[param].source && params[param].source.some(function(source) {
						var path = source.split("."), pathLength = path.length, traversed = sources;
						var next = path.shift();
						while(next) {
							if(traversed.hasOwnProperty(next)) {
								traversed = traversed[next];
								next = path.shift();
							}
							else {
								return;
							}
						}
						if(pathLength === 1) {
							if(traversed.hasOwnProperty(param)) {
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
					if(!obj.req.headers['content-type'] || obj.req.headers['content-type'].indexOf('application/json') === -1) {
						data[param] = castType(data[param], type, paramConfig.validation);
					}

					if(utils.validProperty(paramConfig, "validation")) {
						if(!(validation = obj.configValidator.validate(data[param], paramConfig.validation)).valid) {
							if(!err) {
								err = {};
							}
							if(err[173]) {
								err[173] += ", " + param;
							} else {
								err[173] = "Validation failed for field: " + param;
								validation.errors.forEach(function(validationErr) {
									err[173] += " -> The parameter '" + param + "' " + validationErr.message;
								});
							}
						}
					}
				}
				else {
					if(paramConfig.hasOwnProperty("default")) {
						data[param] = paramConfig.default;
					} else {
						if(!utils.validProperty(paramConfig, "required") || !paramConfig.required) {
							continue;
						}
						if(!err) {
							err = {};
						}
						if(err[172]) {
							err[172] += ", " + param;
						} else {
							err [172] = "Missing required field: " + param;
						}
					}
				}
			}
		}
		if(err) {
			for(var e in err) {
				if(err.hasOwnProperty(e)) {
					errors.push({"code": Number(e), "msg": err[e]});
				}
			}
		}
		if(errors.length === 0) {
			errors = null;
		}
		return cb(errors, data);
	}
};