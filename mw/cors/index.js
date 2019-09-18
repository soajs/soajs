'use strict';

/**
 *
 * @param configuration
 * @returns {Function}
 */
module.exports = function() {
	return function(req, res, next) {
		if(req.soajs && req.soajs.registry && req.soajs.registry.serviceConfig && req.soajs.registry.serviceConfig.cors && req.soajs.registry.serviceConfig.cors.enabled) {
			var method = req.method && req.method.toUpperCase && req.method.toUpperCase();
			var origin = req.soajs.registry.serviceConfig.cors.origin || '*';
			var credentials = req.soajs.registry.serviceConfig.cors.credentials || 'true';
			var methods = req.soajs.registry.serviceConfig.cors.methods || 'GET,HEAD,PUT,PATCH,POST,DELETE';
			var headers = req.soajs.registry.serviceConfig.cors.headers || '__env,key,soajsauth,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type';
			var maxage = req.soajs.registry.serviceConfig.cors.maxage || 1728000;

			if(method === 'OPTIONS') {
				res.setHeader('Access-Control-Allow-Origin', origin);
				res.setHeader('Access-Control-Allow-Credentials', credentials);
				res.setHeader('Access-Control-Allow-Methods', methods);
				res.setHeader('Access-Control-Allow-Headers', headers);
				res.setHeader('Access-Control-Max-Age', maxage);

				res.statusCode = 204;
				res.end();
			}
			else {
				res.setHeader('Access-Control-Allow-Origin', origin);
				res.setHeader('Access-Control-Allow-Credentials', credentials);
				res.setHeader('Access-Control-Expose-Headers', headers);
				next();
			}
		}
		else {
			next();
		}
	};
};
