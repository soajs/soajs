'use strict';

var domain = require('domain');
var url = require('url');
var request = require('request');
var http = require('http');

var coreModules = require("soajs.core.modules");
var core = coreModules.core;

var drivers = require('soajs.core.drivers');

/**
 *
 * @returns {Function}
 */
module.exports = function () {
	return function (req, res, next) {
		if (!req.soajs) {
			throw new TypeError('soajs mw is not started');
		}
		
		if (!req.soajs.controller) {
			req.soajs.controller = {};
		}
		
		var parsedUrl = url.parse(req.url, true);
		if (!req.query && parsedUrl.query && parsedUrl.query.access_token) {
			req.query = parsedUrl.query;
		}
		if (!req.query) {
			req.query = {};
		}
		
		var serviceInfo = parsedUrl.pathname.split('/');
		var service_nv = serviceInfo[1];
		var service_n = service_nv;
		var service_v = null;
		
		//check if there is /v1 in the url
		var matches = req.url.match(/\/v[0-9]+/);
		if (matches && matches.length > 0) {
			var hit = matches[0].replace("/", '');
			if (serviceInfo[2] === hit && serviceInfo.length > 3) {
				service_v = parseInt(hit.replace("v", ''));
				serviceInfo.splice(2, 1);
				req.url = req.url.replace(matches[0], "");
				parsedUrl = url.parse(req.url, true);
			}
		}
		
		//check if there is service:1 in the url
		if (!service_v) {
			var index = service_nv.indexOf(":");
			if (index !== -1) {
				service_v = parseInt(service_nv.substr(index + 1));
				if (isNaN(service_v)) {
					service_v = null;
					req.soajs.log.warn('Service version must be integer: [' + service_nv + ']');
				}
				service_n = service_nv.substr(0, index);
			}
		}
		
		//check if route is key/permission/get then you also need to bypass the exctract Build Param BL
		var keyPermissionGet = (serviceInfo[1] === 'key' && serviceInfo[2] === 'permission' && serviceInfo[3] === 'get');
		if (keyPermissionGet) {
			
			if(!req.headers || !req.headers.key){
				return req.soajs.controllerResponse(core.error.getError(135));
			}
			
			req.soajs.controller.gotoservice = returnKeyAndPermissions;
			var serviceName = "controller";
			req.soajs.controller.serviceParams = {
				"registry": req.soajs.registry.services[serviceName],
				"name": serviceName,
				"url": "/key/permission/get",
				"version": 1,
				"extKeyRequired": true
			};
			
			req.soajs.controller.serviceParams.registry.versions = {
				"1": {
					"extKeyRequired": true,
					"oauth": true,
					"urac": true,
					"urac_ACL": true,
					"provision_ACL": true,
					"apis": [
						{
							"l": "Get Key Permissions",
							"v": "/key/permission/get",
							"m": "get"
						}
					]
				}
			};
			req.soajs.controller.serviceParams.serviceInfo = serviceInfo;
			return next();
		}
		
		//check if proxy/redirect
		//create proxy info object before calling extractbuildparams
		//reason on line: 307
		var proxy = (serviceInfo[1] === 'proxy' && serviceInfo[2] === 'redirect');
		var proxyInfo;
		if (proxy) {
			proxyInfo = {
				query: parsedUrl.query,
				pathname: parsedUrl.pathname
			};
		}
		
		extractBuildParameters(req, service_n, service_nv, service_v, proxyInfo, parsedUrl.path, function (error, parameters) {
			if (error) {
				req.soajs.log.fatal(error);
				return req.soajs.controllerResponse(core.error.getError(130));
			}
			
			if (!parameters) {
				req.soajs.log.fatal("url[", req.url, "] couldn't be matched to a service or the service entry in registry is missing [port || hosts]");
				return req.soajs.controllerResponse(core.error.getError(130));
			}
			
			parameters.parsedUrl = parsedUrl;
			parameters.serviceInfo = serviceInfo;
			req.soajs.controller.serviceParams = parameters;
			
			var d = domain.create();
			d.add(req);
			d.add(res);
			d.on('error', function (err) {
				req.soajs.log.error('Error', err, req.url);
				try {
					req.soajs.log.error('Controller domain error, trying to dispose ...');
					res.on('close', function () {
						d.dispose();
					});
				} catch (err) {
					req.soajs.log.error('Controller domain error, unable to dispose: ', err, req.url);
					d.dispose();
				}
			});
			var passportLogin = false;
			if (serviceInfo[1] === "urac") {
				if (serviceInfo[2] === "passport" && serviceInfo[3] === "login")
					passportLogin = true;
			}
			
			if ((serviceInfo[2] !== "swagger" || (serviceInfo[2] === "swagger" && serviceInfo[serviceInfo.length - 1] === 2)) && parameters.extKeyRequired) {
				var key = req.headers.key || parsedUrl.query.key;
				if (!key) {
					return req.soajs.controllerResponse(core.error.getError(132));
				}
				
				core.key.getInfo(key, req.soajs.registry.serviceConfig.key, function (err, keyObj) {
					if (err) {
						req.soajs.log.warn(err.message);
						return req.soajs.controllerResponse(core.error.getError(132));
					}
					if (!req.headers.key) {
						req.headers.key = key;
					}
					if (passportLogin) {
						req.soajs.controller.gotoservice = simpleRTS;
					} else if (proxy) {
						req.soajs.controller.gotoservice = proxyRequest;
					} else {
						req.soajs.controller.gotoservice = redirectToService;
					}
					
					next();
				});
			}
			else {
				if (passportLogin) {
					req.soajs.controller.gotoservice = simpleRTS;
				} else if (proxy) {
					req.soajs.controller.gotoservice = proxyRequest;
				} else {
					req.soajs.controller.gotoservice = redirectToService;
				}
				
				next();
			}
		});
	};
};

function proxyRequest(req, res) {
	
	/*
	 get ext key for remote env requested
	 */
	var tenant = req.soajs.tenant;
	var parsedUrl = req.soajs.controller.serviceParams.parsedUrl;
	
	var remoteENV = (parsedUrl.query) ? parsedUrl.query.__env : req.headers.__env;
	remoteENV = remoteENV.toUpperCase();
	
	var requestedRoute;
	//check if requested route is provided as query param
	if (parsedUrl.query && parsedUrl.query.proxyRoute) {
		requestedRoute = decodeURIComponent(parsedUrl.query.proxyRoute);
	}
	//possible requested route is provided as path param
	if (!requestedRoute && parsedUrl.pathname.replace(/^\/proxy/, '') !== '') {
		requestedRoute = parsedUrl.pathname.replace(/^\/proxy/, '');
	}
	
	//stop if no requested path was found
	if (!requestedRoute) {
		return req.soajs.controllerResponse(core.error.getError(139));
	}
	
	req.soajs.log.debug("attempting to redirect to: " + requestedRoute + " in " + remoteENV + " Environment.");
	
	if (tenant) {
		getOriginalTenantRecord(tenant, function (error, originalTenant) {
			if (error) {
				return req.soajs.controllerResponse(core.error.getError(139)); //todo: make sure we have set the correct error code number
			}
			
			//get extKey for remote environment for this tenant
			var remoteExtKey = findExtKeyForEnvironment(originalTenant, remoteENV);
			
			//no key found
			if (!remoteExtKey) {
				req.soajs.log.fatal("No remote key found for tenant: " + tenant.code + " in environment: " + remoteENV);
				return req.soajs.controllerResponse(core.error.getError(137));
			}
			else {
				//proceed with proxying the request
				proxyRequestToRemoteEnv(req, res, remoteENV, remoteExtKey, requestedRoute);
			}
			
		});
	}
	else {
		proxyRequestToRemoteEnv(req, res, remoteENV, null, requestedRoute);
	}
}

/**
 * function that fetches a tenant record from core.provision
 * @param {Object} tenant
 * @param {Callback} cb
 */
function getOriginalTenantRecord(tenant, cb) {
	core.provision.getTenantByCode(tenant.code, cb);
}

/**
 * function that finds if this tenant has a dashboard access extkey for requested env code
 * @param {Object} tenant
 * @param {String} env
 * @returns {null|String}
 */
function findExtKeyForEnvironment(tenant, env) {
	var key;
	tenant.applications.forEach(function (oneApplication) {
		
		//loop in tenant keys
		oneApplication.keys.forEach(function (oneKey) {
			
			//loop in tenant ext keys
			oneKey.extKeys.forEach(function (oneExtKey) {
				//get the ext key for the request environment who also has dashboardAccess true
				//note: only one extkey per env has dashboardAccess true, simply find it and break
				if (oneExtKey.env && oneExtKey.env === env && oneExtKey.dashboardAccess) {
					key = oneExtKey.extKey; // key or ext key/.???? no key
				}
			});
		});
	});
	return key;
}

/**
 * load controller information for remote requested environment and proxy the request to its controller.
 *
 * @param {Object} req
 * @param {Object} res
 * @param {String} remoteENV
 * @param {String} remoteExtKey
 * @param {String} requestedRoute
 */
function proxyRequestToRemoteEnv(req, res, remoteENV, remoteExtKey, requestedRoute) {
	//get remote env controller
	req.soajs.awarenessEnv.getHost(remoteENV.toLowerCase(), function (host) {
		if (!host) {
			return req.soajs.controllerResponse(core.error.getError(138));
		}
		
		//get remote env controller port
		core.registry.loadByEnv({"envCode": remoteENV}, function (err, reg) {
			if (err) {
				req.soajs.log.error(err);
				return req.soajs.controllerResponse(core.error.getError(207));
			}
			else {
				//formulate request and pipe
				var port = reg.services.controller.port;
				var myUri = 'http://' + host + ':' + port + requestedRoute;
				
				var requestConfig = {
					'uri': myUri,
					'method': req.method,
					'timeout': 1000 * 3600,
					'jar': false,
					'headers': req.headers
				};
				
				if (remoteExtKey) {
					//add remote ext key in headers
					requestConfig.headers.key = remoteExtKey;
				}
				else {
					delete requestConfig.headers.key;
				}
				
				//add remaining query params
				if (req.query && Object.keys(req.query).length > 0) {
					requestConfig.qs = req.query;
				}
				req.soajs.log.debug(requestConfig);
				
				//proxy request
				var proxy = request(requestConfig);
				proxy.on('error', function (error) {
					req.soajs.log.error(error);
					try {
						return req.soajs.controllerResponse(core.error.getError(135));
					} catch (e) {
						req.soajs.log.error(e);
					}
				});
				
				if (req.method === 'POST' || req.method === 'PUT') {
					req.pipe(proxy).pipe(res);
				}
				else {
					proxy.pipe(res);
				}
			}
		});
	});
}

/**
 *
 * @param req
 * @param service
 * @param service_nv
 * @param version
 * @param url
 * @returns {*}
 */
function extractBuildParameters(req, service, service_nv, version, proxyInfo, url, callback) {
	
	if (proxyInfo) {
		var requestedRoute;
		//check if requested route is provided as query param
		if (proxyInfo.query && proxyInfo.query.proxyRoute) {
			requestedRoute = decodeURIComponent(proxyInfo.query.proxyRoute);
		}
		//possible requested route is provided as path param
		if (!requestedRoute && proxyInfo.pathname.replace(/^\/proxy/, '') !== '') {
			requestedRoute = proxyInfo.pathname.replace(/^\/proxy/, '');
		}
		
		var serviceName = requestedRoute.split("/")[1];
		if (!req.soajs.registry.services[serviceName]) {
			return callback(core.error.getError(130));
		}
		
		var proxyInfo = {
			"registry": req.soajs.registry.services[serviceName],
			"name": serviceName,
			"url": requestedRoute,
			"version": req.soajs.registry.services[serviceName].version || 1,
			"extKeyRequired": true
		};
		return callback(null, proxyInfo);
	} else {
		if (service &&
			req.soajs.registry &&
			req.soajs.registry.services &&
			req.soajs.registry.services[service] &&
			req.soajs.registry.services[service].port &&
			(process.env.SOAJS_DEPLOY_HA || req.soajs.registry.services[service].hosts)
		) {
			service = service.toLowerCase();
			service_nv = service_nv.toLowerCase();
			
			var nextStep = function (version) {
				var extKeyRequired = false;
				if (req.soajs.registry.services[service].versions && req.soajs.registry.services[service].versions[version])
					extKeyRequired = req.soajs.registry.services[service].versions[version].extKeyRequired || false;
				
				var serviceInfo = {
					"registry": req.soajs.registry.services[service],
					"name": service,
					"url": url.substring(service_nv.length + 1),
					"version": version,
					"extKeyRequired": extKeyRequired
				};
				var path = serviceInfo.url;
				var pathIndex = path.indexOf("?");
				if (pathIndex !== -1) {
					path = path.substring(0, pathIndex);
					pathIndex = path.lastIndexOf("/");
					if (pathIndex === (path.length - 1))
						path = path.substring(0, pathIndex);
				}
				serviceInfo.path = path;
				return callback(null, serviceInfo);
			};
			
			if (!version) {
				if (process.env.SOAJS_DEPLOY_HA) {
					var latestCachedVersion = req.soajs.awareness.getLatestVersionFromCache(service);
					if (latestCachedVersion) {
						version = latestCachedVersion;
						nextStep(version);
					}
					else {
						var info = req.soajs.registry.deployer.selected.split('.');
						var deployerConfig = req.soajs.registry.deployer.container[info[1]][info[2]];
						
						var options = {
							"strategy": process.env.SOAJS_DEPLOY_HA,
							"driver": info[1] + "." + info[2],
							"deployerConfig": deployerConfig,
							"soajs": {
								"registry": req.soajs.registry
							},
							"model": {},
							"params": {
								"serviceName": service,
								"env": process.env.SOAJS_ENV
							}
						};
						drivers.getLatestVersion(options, function (error, latestVersion) {
							if (error) {
								return callback(error);
							}
							version = latestVersion;
							nextStep(version);
						});
					}
				}
				else if (req.soajs.registry.services[service].hosts) {
					version = req.soajs.registry.services[service].hosts.latest;
					nextStep(version);
				} else {
					return callback(null, null);
				}
			}
			else
				nextStep(version);
		}
		else {
			return callback(null, null);
		}
	}
}

/**
 *
 * @param req
 * @param res
 */
function simpleRTS(req, res) {
	preRedirect(req, res, function (obj) {
		req.pause();
		
		var requestOptions = url.parse(obj.uri);
		requestOptions.headers = req.headers;
		requestOptions.method = req.method;
		requestOptions.agent = false;
		requestOptions.headers['host'] = requestOptions.host;
		
		if (obj.config.authorization)
			isRequestAuthorized(req, requestOptions);
		
		var connector = http.request(requestOptions, function (serverResponse) {
			serverResponse.pause();
			serverResponse.headers['access-control-allow-origin'] = '*';
			
			res.writeHeader(serverResponse.statusCode, serverResponse.headers);
			serverResponse.pipe(res, {end: true});
			serverResponse.resume();
		});
		connector.on('aborted', function (err) {
			req.soajs.log.error(err);
			try {
				return req.soajs.controllerResponse(core.error.getError(135));
			} catch (e) {
				req.soajs.log.error(e);
			}
		});
		req.pipe(connector, {end: true});
		req.resume();
	});
}

/**
 *
 * @param req
 * @param res
 * @returns {*}
 */
function redirectToService(req, res) {
	preRedirect(req, res, function (obj) {
		var requestOptions = {
			'method': req.method,
			'uri': obj.uri,
			'timeout': 1000 * 3600,
			'headers': req.headers,
			'jar': false
		};
		
		if (obj.config.authorization)
			isRequestAuthorized(req, requestOptions);
		
		req.soajs.controller.redirectedRequest = request(requestOptions);
		req.soajs.controller.redirectedRequest.on('error', function (err) {
			req.soajs.log.error(err);
			try {
				return req.soajs.controllerResponse(core.error.getError(135));
			} catch (e) {
				req.soajs.log.error(e);
			}
		});
		
		if (req.method === 'POST' || req.method === 'PUT') {
			req.pipe(req.soajs.controller.redirectedRequest).pipe(res);
		} else {
			req.soajs.controller.redirectedRequest.pipe(res);
		}
	});
}

/**
 *
 * @param req
 * @param res
 * @param cb
 */
function preRedirect(req, res, cb) {
	var restServiceParams = req.soajs.controller.serviceParams;
	
	var config = req.soajs.registry.services.controller;
	if (!config)
		return req.soajs.controllerResponse(core.error.getError(131));
	
	var requestTOR = restServiceParams.registry.requestTimeoutRenewal || config.requestTimeoutRenewal;
	var requestTO = restServiceParams.registry.requestTimeout || config.requestTimeout;
	
	req.soajs.awareness.getHost(restServiceParams.name, restServiceParams.version, function (host) {
		if (!host) {
			req.soajs.log.error('Unable to find any healthy host for service [' + restServiceParams.name + (restServiceParams.version ? ('@' + restServiceParams.version) : '') + ']');
			return req.soajs.controllerResponse(core.error.getError(133));
		}
		
		req.soajs.log.info({
			"serviceName": restServiceParams.name,
			"host": host,
			"url": restServiceParams.url,
			"header": req.headers
		});
		
		req.soajs.controller.renewalCount = 0;
		res.setTimeout(requestTO * 1000, function () {
			req.soajs.log.warn('Request is taking too much time ...');
			req.soajs.controller.renewalCount++;
			if (req.soajs.controller.renewalCount <= requestTOR) {
				req.soajs.log.info('Trying to keep request alive by checking the service heartbeat ...');
				request({
					'uri': 'http://' + host + ':' + (restServiceParams.registry.port + req.soajs.registry.serviceConfig.ports.maintenanceInc) + '/heartbeat',
					'headers': req.headers
				}, function (error, response) {
					if (!error && response.statusCode === 200) {
						req.soajs.log.info('... able to renew request for ', requestTO, 'seconds');
						res.setTimeout(requestTO * 1000);
					} else {
						req.soajs.log.error('Service heartbeat is not responding');
						return req.soajs.controllerResponse(core.error.getError(133));
					}
				});
			} else {
				req.soajs.log.error('Request time exceeded the requestTimeoutRenewal:', requestTO + requestTO * requestTOR);
				return req.soajs.controllerResponse(core.error.getError(134));
			}
		});
		
		return cb({
			'host': host,
			'config': config,
			'uri': 'http://' + host + ':' + restServiceParams.registry.port + restServiceParams.url
		});
	});
}

/**
 *
 * @param req
 * @param requestOptions
 * @returns {boolean}
 */
function isRequestAuthorized(req, requestOptions) {
	requestOptions.headers.cookie = requestOptions.headers.cookie || '';
	var cookies = requestOptions.headers.cookie.split(';');
	cookies.some(function (cookie, idx, arr) {
		if (cookie.indexOf(req.soajs.registry.serviceConfig.session.name) !== -1) {
			return true;
		}
	});
	
	var soajsauth = (req.headers && req.headers.soajsauth);
	if (!soajsauth) {
		try {
			var parsedUrl = url.parse(req.url, true);
			soajsauth = parsedUrl && parsedUrl.query && parsedUrl.query.soajsauth;
		} catch (e) {
			return false;
		}
	}
	if (soajsauth) {
		var ccc = core.security.authorization.setCookie(soajsauth, req.soajs.registry.serviceConfig.session.secret, req.soajs.registry.serviceConfig.session.name);
		if (ccc) {
			cookies.push(ccc);
			requestOptions.headers.cookie = cookies.join(';');
			return true;
		}
	}
	return false;
}

/**
 * Function that retrieves the dashboard access key and its ACL permissions from the public extkey provided via the header
 * @param req
 * @param res
 */
function returnKeyAndPermissions(req, res) {
	if(!req.soajs.uracDriver){
		return req.soajs.controllerResponse(core.error.getError(135));
	}
	
	var tenant = req.soajs.uracDriver.getProfile().tenant;
	findExtKey(tenant, function (error, data) {
		if (error) {
			req.soajs.log.error(error);
			return req.soajs.controllerResponse(core.error.getError(135));
		}
		
		findKeyPermissions(function(error, info){
			if (error) {
				req.soajs.log.error(error);
				return req.soajs.controllerResponse(core.error.getError(135));
			}
			
			for (let i in info) {
				data[i] = info[i];
			}
			return req.soajs.controllerResponse(data);
		});
	});
	
	function findExtKey(tenant, cb) {
		core.provision.getPrivateExtKeyFromPulic(tenant, cb);
	}
	
	function findKeyPermissions(cb) {
		var ACL = req.soajs.uracDriver.getAclAllEnv();
		var tenant = req.soajs.tenant;
		if (!ACL) {
			ACL = (tenant.application.acl_all_env) ? tenant.application.acl_all_env : tenant.application.package_acl_all_env;
			
			//old system acl schema
			if (!ACL) {
				ACL = (tenant.application.acl) ? tenant.application.acl : tenant.application.package_acl;
			}
		}
		
		core.registry.getAllRegistriesInfo(function(error, environments){
			if(error){
				return cb(error);
			}
			
			var envInfo = core.provision.getACLAndEnvironmentsFromKey(ACL, environments);
			return cb(null, {"acl": ACL, "environments": envInfo});
		});
	}
}