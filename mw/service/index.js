'use strict';

var MultiTenantSession = require("../../classes/MultiTenantSession");
var async = require("async");

var regEnvironment = (process.env.SOAJS_ENV || "dev");
regEnvironment = regEnvironment.toLowerCase();

/**
 *
 * @param configuration
 * @returns {Function}
 */
module.exports = function (configuration) {
	var soajs = configuration.soajs;
	var param = configuration.param;
	var app = configuration.app;
	
	function mapInjectedObject(req) {
		
		var input = req.headers['soajsinjectobj'];
		if(typeof input === 'string'){
			input = JSON.parse(input);
		}
		
		var output = {};

		if (!input) {
			return output;
		}
		
		if (input.tenant) {
			output.tenant = {
				id: input.tenant.id,
				code: input.tenant.code
			};
		}

		if (input.key) {
			output.key = {
				config: input.key.config,
				iKey: input.key.iKey,
				eKey: input.key.eKey
			};
		}
		
		if (input.application) {
			output.application = {
				product: input.application.product,
				package: input.application.package,
				appId: input.application.appId,
				acl: input.application.acl,
				acl_all_env: input.application.acl_all_env
			};
		}

		if (input.package) {
			output.package = {
				acl: input.package.acl,
				acl_all_env: input.package.acl_all_env
			};
		}

		if(input.device){
			output.device = input.device || {};
		}
		
		if(input.geo){
			output.geo = input.geo || {};
		}
		
		return output;
	}
	
	/**
	 *
	 * @param obj
	 * @param cb
	 * @returns {*}
	 */
	function sessionCheck(obj, cb) {
		var mtSessionParam = {
			'session': obj.req.session,
			'tenant': {
				'id': obj.req.soajs.tenant.id,
				'key': obj.req.soajs.tenant.key.iKey,
				'extKey': obj.req.soajs.tenant.key.extKey
			},
			'product': {
				'product': obj.req.soajs.tenant.application.product,
				'package': obj.req.soajs.tenant.application.package,
				'appId': obj.req.soajs.tenant.application.appId
			},
			'request': {'service': obj.app.soajs.param.serviceName, 'api': obj.req.route.path},
			'device': obj.req.soajs.device,
			'geo': obj.req.soajs.geo,
			'req': obj.req
		};
		var mtSession = new MultiTenantSession(mtSessionParam);
		obj.req.soajs.session = mtSession;
		return cb(null, obj);
	}
	
	return function (req, res, next) {
		
		var injectObj = mapInjectedObject(req);
		if (injectObj && injectObj.application && injectObj.application.package && injectObj.key && injectObj.tenant) {
			req.soajs.tenant = injectObj.tenant;
			req.soajs.tenant.key = {
				"iKey": injectObj.key.iKey,
				"eKey": injectObj.key.eKey
			};
			req.soajs.tenant.application = injectObj.application;
			
			if (injectObj.package) {
				req.soajs.tenant.application.package_acl = injectObj.package.acl;
				req.soajs.tenant.application.package_acl_all_env = injectObj.package.acl_all_env;
				req.soajs.servicesConfig = injectObj.key.config;
				req.soajs.device = injectObj.device;
				req.soajs.geo = injectObj.geo;
				
				var serviceCheckArray = [function (cb) {
					cb(null, {
						"app": app,
						"res": res,
						"req": req
					});
				}];
				
				if (param.session)
					serviceCheckArray.push(sessionCheck);
				
				async.waterfall(serviceCheckArray, function (err, data) {
					if (err)
						return next(err);
					else
						return next();
				});
			}
			else
				return next(152);
		}
		else
			return next(153);
	};
}
;
