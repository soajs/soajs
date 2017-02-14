'use strict';

var domain = require('domain');
var url = require('url');
var request = require('request');
var http = require('http');

var core = require('../../modules/soajs.core');
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

        var serviceInfo = parsedUrl.pathname.split('/');
        var service_nv = serviceInfo[1];
        var service_n = service_nv;
        var service_v = null;
        var index = service_nv.indexOf(":");
        if (index !== -1) {
            service_v = parseInt(service_nv.substr(index + 1));
            if (isNaN(service_v)) {
                service_v = null;
                req.soajs.log.warn('Service version must be integer: [' + service_nv + ']');
            }
            service_n = service_nv.substr(0, index);
        }
        extractBuildParameters(req, service_n, service_nv, service_v, parsedUrl.path, function(error, parameters){
        	if(error){
		        req.soajs.log.fatal(error);
		        return req.soajs.controllerResponse(core.error.getError(130));
	        }
	
	        if (!parameters) {
		        req.soajs.log.fatal("url[", req.url, "] couldn't be matched to a service or the service entry in registry is missing [port || hosts]");
		        return req.soajs.controllerResponse(core.error.getError(130));
	        }
	
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
	        if (serviceInfo[1] === "urac"){
		        if (serviceInfo[2] === "passport" && serviceInfo[3] === "login")
			        passportLogin = true;
	        }
	        if (parameters.extKeyRequired) {
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
			        if (passportLogin)
				        req.soajs.controller.gotoservice = simpleRTS;
			        else
				        req.soajs.controller.gotoservice = redirectToService;
			
			        next();
		        });
	        }
	        else {
		        if (passportLogin)
			        req.soajs.controller.gotoservice = simpleRTS;
		        else
			        req.soajs.controller.gotoservice = redirectToService;
		        next();
	        }
        });
    };
};

/**
 *
 * @param req
 * @param service
 * @param service_nv
 * @param version
 * @param url
 * @returns {*}
 */
function extractBuildParameters(req, service, service_nv, version, url, callback) {
    if (service &&
	    req.soajs.registry &&
	    req.soajs.registry.services &&
	    req.soajs.registry.services[service] &&
	    req.soajs.registry.services[service].port &&
	    (process.env.SOAJS_DEPLOY_HA || req.soajs.registry.services[service].hosts)
    ) {

        service = service.toLowerCase();
        service_nv = service_nv.toLowerCase();

        var nextStep = function(version){
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

            return callback(null, serviceInfo);
        };

        if (!version){
        	if(process.env.SOAJS_DEPLOY_HA){
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
		
		        drivers.getLatestVersion(options, function(error, latestVersion){
		        	if(error){
				        return callback(error);
			        }
			        version = latestVersion;
			        nextStep(version);
		        });
	        }
	        else if(req.soajs.registry.services[service].hosts){
		        version = req.soajs.registry.services[service].hosts.latest;
		        nextStep(version);
	        }
	        else{
		        return callback(null, null);
	        }
        }
        else
            nextStep(version);
    }
    else{
	    return callback(null, null);
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