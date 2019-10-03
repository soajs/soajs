'use strict';

var domain = require('domain');
var url = require('url');
var request = require('request');
var http = require('http');

var coreModules = require("soajs.core.modules");
var core = coreModules.core;
var provision = coreModules.provision;
var coreLibs = require("soajs.core.libs");

var drivers = require('soajs.core.drivers');

var regEnvironment = (process.env.SOAJS_ENV || "dev");
regEnvironment = regEnvironment.toLowerCase();

/**
 *
 * @returns {Function}
 */
module.exports = function () {
    return function (req, res, next) {

        if (!req.soajs) {
            throw new TypeError('soajs mw is not started');
        }

        let serviceInfo = req.soajs.controller.serviceParams.serviceInfo;
        let parsedUrl = req.soajs.controller.serviceParams.parsedUrl;
        let service_nv = req.soajs.controller.serviceParams.service_nv;
        let service_n = req.soajs.controller.serviceParams.service_n;
        let service_v = req.soajs.controller.serviceParams.service_v;

        //check if route is key/permission/get then you also need to bypass the exctract Build Param BL
        var keyPermissionGet = (serviceInfo[1] === 'key' && serviceInfo[2] === 'permission' && serviceInfo[3] === 'get');
        if (keyPermissionGet) {

            //doesn't work without a key in the headers
            if (!req.headers || !req.headers.key) {
                return req.soajs.controllerResponse(core.error.getError(132));
            }

            //mimic a service named controller with route /key/permission/get
            var serviceName = "controller";
            let parameters = {
                "serviceInfo": serviceInfo,
                "registry": req.soajs.registry.services[serviceName],
                "name": serviceName,
                "url": "/key/permission/get",
                "version": 1,
                "extKeyRequired": true
            };

            //Make sure the below param are always available on serviceParams because they are needed by MW.MT
            parameters.keyObj = req.soajs.controller.serviceParams.keyObj;
            parameters.packObj = req.soajs.controller.serviceParams.packObj;
            parameters.finalAcl = req.soajs.controller.serviceParams.finalAcl;

            req.soajs.controller.serviceParams = parameters;

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

            //assign the correct method to gotoservice in controller
            req.soajs.controller.gotoservice = returnKeyAndPermissions;
            return next();
        }

        //check if proxy/redirect
        //create proxy info object before calling extractbuildparams
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
	            req.soajs.log.debug(req.headers);
                return req.soajs.controllerResponse(core.error.getError(130));
            }

            if (!parameters) {
                req.soajs.log.fatal("url[", req.url, "] couldn't be matched to a service or the service entry in registry is missing [port || hosts]");
	            req.soajs.log.debug(req.headers);
                return req.soajs.controllerResponse(core.error.getError(130));
            }

            parameters.parsedUrl = parsedUrl;
            parameters.serviceInfo = serviceInfo;

            //Make sure the below param are always available on serviceParams because they are needed by MW.MT
            parameters.keyObj = req.soajs.controller.serviceParams.keyObj;
            parameters.packObj = req.soajs.controller.serviceParams.packObj;
            parameters.finalAcl = req.soajs.controller.serviceParams.finalAcl;

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
    let tenant = req.soajs.tenant;
    let parsedUrl = req.soajs.controller.serviceParams.parsedUrl;
    let remoteENV = req.headers.__env;
    if (parsedUrl.query && parsedUrl.query.__env)
        remoteENV = parsedUrl.query.__env;
    if (remoteENV)
        remoteENV = remoteENV.toUpperCase();

    var requestedRoute;
    //check if requested route is provided as query param
    if (parsedUrl.query && parsedUrl.query.proxyRoute) {
        requestedRoute = decodeURIComponent(parsedUrl.query.proxyRoute);
    }
    //possible requested route is provided as path param
    //if (!requestedRoute && parsedUrl.pathname.replace(/^\/proxy/, '') !== '') {
    //    requestedRoute = parsedUrl.pathname.replace(/^\/proxy/, '');
    //}

    //stop if no requested path was found
    if (!requestedRoute) {
        return req.soajs.controllerResponse(core.error.getError(139));
    }

    if (remoteENV)
        req.soajs.log.debug("attempting to redirect to: " + requestedRoute + " in " + remoteENV + " Environment.");
    else
        req.soajs.log.debug("attempting to redirect to: " + requestedRoute);

    let tCode = null;
    let tExtKey = null;

    if (parsedUrl.query) {
        if (parsedUrl.query.tCode)
            tCode = parsedUrl.query.tCode;
        else if (tenant)
            tCode = tenant.code;

        if (parsedUrl.query.extKey)
            tExtKey = parsedUrl.query.extKey;
    }
    if (tExtKey) {
        //proceed with proxying the request
        proxyRequestToRemoteEnv(req, res, remoteENV, tExtKey, requestedRoute);
    }
    else if (tCode && remoteENV) {
        getOriginalTenantRecord(tCode, function (error, originalTenant) {
            if (error) {
                return req.soajs.controllerResponse(core.error.getError(139)); //todo: make sure we have set the correct error code number
            }

            //get extKey for remote environment for this tenant
            var remoteExtKey = findExtKeyForEnvironment(originalTenant, remoteENV);

            //no key found
            if (!remoteExtKey) {
                req.soajs.log.fatal("No remote key found for tenant: " + tCode + " in environment: " + remoteENV);
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
 * @param tCode
 * @param cb
 */
function getOriginalTenantRecord(tCode, cb) {
    core.provision.getTenantByCode(tCode, cb);
}

/**
 * function that finds if this tenant has a dashboard access extkey for requested env code
 * @param {Object} tenant
 * @param {String} env
 * @returns {null|String}
 */
function findExtKeyForEnvironment(tenant, env) {
    let key;
    tenant.applications.forEach(function (oneApplication) {

        //loop in tenant keys
        oneApplication.keys.forEach(function (oneKey) {

            //loop in tenant ext keys
            oneKey.extKeys.forEach(function (oneExtKey) {
                //get the ext key for the request environment who also has dashboardAccess true
                //note: only one extkey per env has dashboardAccess true, simply find it and break
                if (oneExtKey.env && oneExtKey.env === env) {
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
    let triggerProxy = (myUri, requestTO) => {
        let requestConfig = {
            'uri': myUri,
            'method': req.method,
            'timeout': requestTO * 1000,
            'jar': false,
            'headers': req.headers
        };

        requestConfig.headers.soajs_roaming = regEnvironment;

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
            delete requestConfig.qs.proxyRoute;
            delete requestConfig.qs.__env;
        }

        delete requestConfig.headers.host;

        req.soajs.log.debug(requestConfig);

        try {
            //proxy request
            req.soajs.controller.redirectedRequest = request(requestConfig);
            req.soajs.controller.redirectedRequest.on('error', function (error) {
                req.soajs.log.error(error);
                return req.soajs.controllerResponse(core.error.getError(135));
            });

            if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
                req.pipe(req.soajs.controller.redirectedRequest).pipe(res);
            }
            else {
                req.soajs.controller.redirectedRequest.pipe(res);
            }
        } catch (e) {
            req.soajs.log.error(e);
            return req.soajs.controllerResponse(core.error.getError(135));
        }
    };
    if (!remoteENV) {
        triggerProxy(requestedRoute, 30);
    }
    else {
        //get remote env registry
        core.registry.loadByEnv({"envCode": remoteENV}, function (err, reg) {
            if (err) {
                req.soajs.log.error(err);
                return req.soajs.controllerResponse(core.error.getError(207));
            }
            else {
                let config = req.soajs.registry.services.controller;
                if (!config)
                    return req.soajs.controllerResponse(core.error.getError(131));
                let requestTO = config.requestTimeout;
                if (!reg.protocol || !reg.domain || !reg.port)
                    return req.soajs.controllerResponse(core.error.getError(208));
                //formulate request and pipe
                let myUri = reg.protocol + '://' + (reg.apiPrefix ? reg.apiPrefix + "." : "") + reg.domain + ':' + reg.port + requestedRoute;
                triggerProxy(myUri, requestTO);
            }
        });
    }
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
        let requestedRoute;
        //check if requested route is provided as query param
        if (proxyInfo.query && proxyInfo.query.proxyRoute) {
            requestedRoute = decodeURIComponent(proxyInfo.query.proxyRoute);
        }
        //possible requested route is provided as path param
        if (!requestedRoute && proxyInfo.pathname.replace(/^\/proxy/, '') !== '') {
            requestedRoute = proxyInfo.pathname.replace(/^\/proxy/, '');
        }
        proxyInfo = {
            "url": requestedRoute,
            "extKeyRequired": false
        };
        let serviceName = requestedRoute.split("/")[1];
        //if (!req.soajs.registry.services[serviceName]) {
        //return callback(core.error.getError(130));
        //}
        if (req.soajs.registry.services[serviceName]) {
            proxyInfo = {
                "registry": req.soajs.registry.services[serviceName],
                "name": serviceName,
                "url": requestedRoute,
                "version": req.soajs.registry.services[serviceName].version || 1,
                "extKeyRequired": false
            };
        }
        if (req.headers.key)
            proxyInfo.extKeyRequired = true;

        return callback(null, proxyInfo);
    } else {
        if (service &&
            req.soajs.registry &&
            req.soajs.registry.services &&
            req.soajs.registry.services[service] &&
            req.soajs.registry.services[service].port &&
            (process.env.SOAJS_DEPLOY_HA || req.soajs.registry.services[service].hosts || req.soajs.registry.services[service].srcType === "endpoint")
        ) {
            //service = service.toLowerCase();
            //service_nv = service_nv.toLowerCase();

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

                        let strategy = process.env.SOAJS_DEPLOY_HA;
                        if (strategy === 'swarm') {
                            strategy = 'docker';
                        }
                        var options = {
                            "strategy": strategy,
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
                        drivers.execute({
                            "type": "container",
                            "driver": options.strategy
                        }, 'getLatestVersion', options, (error, latestVersion) => {
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
                    return nextStep(version);
                } else if (req.soajs.registry.services[service].srcType === "endpoint") {
                    //TODO: we should support what version is available aka deployed
                    if (req.soajs.registry.endpoints && req.soajs.registry.endpoints.deployed && req.soajs.registry.endpoints.deployed[service]) {
                        if (Array.isArray(req.soajs.registry.endpoints.deployed[service])) {
                            let ver = req.soajs.registry.endpoints.deployed[service][0];
                            for (let i = 1; i < req.soajs.registry.endpoints.deployed[service].length; i++) {
                                ver = coreLibs.version.getLatest(ver, req.soajs.registry.endpoints.deployed[service][i]);
                            }
                            return nextStep(ver);
                        }
                    }
                    return callback(null, null);
                } else {
                    return callback(null, null);
                }
            }
            else
                return nextStep(version);
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

        try {
            req.soajs.controller.redirectedRequest = http.request(requestOptions, function (serverResponse) {
                serverResponse.pause();
                serverResponse.headers['access-control-allow-origin'] = '*';

                res.writeHeader(serverResponse.statusCode, serverResponse.headers);
                serverResponse.pipe(res, {end: true});
                serverResponse.resume();
            });
            req.soajs.controller.redirectedRequest.on('error', function (err) {
                req.soajs.log.error(err);
                if (!req.soajs.controller.monitorEndingReq) {
                    return req.soajs.controllerResponse(core.error.getError(135));
                }
            });
            req.pipe(req.soajs.controller.redirectedRequest, {end: true});
            req.resume();
        } catch (e) {
            req.soajs.log.error(e);
            if (!req.soajs.controller.monitorEndingReq) {
                return req.soajs.controllerResponse(core.error.getError(135));
            }
        }
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
        let requestOptions = {
            'method': req.method,
            'uri': obj.uri,
            //'timeout': obj.requestTO * 1000,
            'headers': req.headers,
            'jar': false
        };
        if (obj.config.authorization)
            isRequestAuthorized(req, requestOptions);

        try {
            req.soajs.controller.redirectedRequest = request(requestOptions);
            req.soajs.controller.redirectedRequest.on('error', function (err) {
                req.soajs.log.error(err);
                if (!req.soajs.controller.monitorEndingReq) {
                    return req.soajs.controllerResponse(core.error.getError(135));
                }
            });

            if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
                req.pipe(req.soajs.controller.redirectedRequest).pipe(res);
            } else {
                req.soajs.controller.redirectedRequest.pipe(res);
            }
        } catch (e) {
            req.soajs.log.error(e);
            if (!req.soajs.controller.monitorEndingReq) {
                return req.soajs.controllerResponse(core.error.getError(135));
            }
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

    let nextStep = function (host, port, fullURI) {
        req.soajs.log.info({
            "serviceName": restServiceParams.name,
            "host": host,
            "version": restServiceParams.version,
            "url": restServiceParams.url,
            "port": restServiceParams.registry.port,
            "header": req.headers
        });

        let requestTOR = restServiceParams.registry.requestTimeoutRenewal || config.requestTimeoutRenewal;
        let requestTO = restServiceParams.registry.requestTimeout || config.requestTimeout;

        let timeToRenew = requestTO * 100;
        req.soajs.controller.renewalCount = 0;
        req.soajs.controller.monitorEndingReq = false;

        let renewReqMonitor = function () {
            req.soajs.log.warn('Request is taking too much time ...');
            req.soajs.controller.renewalCount++;
            if (req.soajs.controller.renewalCount <= requestTOR) {
                req.soajs.log.info('Trying to keep request alive by checking the service heartbeat ...');

                let uri = 'http://' + host + ':' + (restServiceParams.registry.port + req.soajs.registry.serviceConfig.ports.maintenanceInc) + '/heartbeat';

                if (restServiceParams.registry.maintenance && restServiceParams.registry.maintenance.readiness && restServiceParams.registry.maintenance.port) {
                    let maintenancePort = port;
                    let path = restServiceParams.registry.maintenance.readiness;
                    if ("maintenance" === restServiceParams.registry.maintenance.port.type)
                        maintenancePort = maintenancePort + req.soajs.registry.serviceConfig.ports.maintenanceInc;
                    else if ("inherit" === restServiceParams.registry.maintenance.port.type)
                        maintenancePort = port;
                    else {
                        let tempPort = parseInt(restServiceParams.registry.maintenance.port.value);
                        if (!isNaN(tempPort)) {
                            maintenancePort = restServiceParams.registry.maintenance.port.value;
                        }
                    }
                    uri = 'http://' + host + ':' + maintenancePort + path;
                }
                req.soajs.log.info("heartbeat @: " + uri);
                request({
                    'uri': uri,
                    'headers': req.headers
                }, function (error, response) {
                    let resContentType = res.getHeader('content-type');
                    let isStream = false;
                    if (resContentType)
                        isStream = resContentType.match(/stream/i);
                    if (!error && response.statusCode === 200) {
                        if (isStream) {
                            req.soajs.controller.renewalCount--;
                            req.soajs.log.info('Stream detected for [' + req.url + ']. Connection will remain open ...');
                        }
                        else {
                            req.soajs.log.info('... able to renew request for ', requestTO, 'seconds');
                            res.setTimeout(timeToRenew, renewReqMonitor);
                        }
                    } else {
                        req.soajs.controller.monitorEndingReq = true;
                        req.soajs.log.error('Service heartbeat is not responding');
                        req.soajs.controller.redirectedRequest.abort();
                        return req.soajs.controllerResponse(core.error.getError(133));
                    }
                });
            } else {
                if (req.soajs.controller.redirectedRequest) {
                    req.soajs.log.info("Request aborted:", req.url);
                    req.soajs.controller.redirectedRequest.abort();
                }
                if (!req.soajs.controller.monitorEndingReq) {
                    req.soajs.controller.monitorEndingReq = true;
                    req.soajs.log.error('Request time exceeded the requestTimeoutRenewal:', requestTO + requestTO * requestTOR);
                    return req.soajs.controllerResponse(core.error.getError(134));
                }
            }
        };

        res.setTimeout(timeToRenew, renewReqMonitor);

        return cb({
            'host': host,
            'config': config,
            'requestTO': requestTO,
            'uri': (fullURI ? host + restServiceParams.url : 'http://' + host + ':' + port + restServiceParams.url)
        });
    };

    if (restServiceParams.registry.srcType && restServiceParams.registry.srcType === "endpoint") {
        let host = restServiceParams.registry.src.url;
        if (restServiceParams.version && restServiceParams.registry.src.urls) {
            for (let i = 0; i < restServiceParams.registry.src.urls.length; i++) {
                if (restServiceParams.registry.src.urls[i].version === restServiceParams.version)
                    host = restServiceParams.registry.src.urls[i].url
            }
        }
        if (restServiceParams.keyObj && restServiceParams.keyObj.config) {
            if (restServiceParams.keyObj.config[restServiceParams.name] && restServiceParams.keyObj.config[restServiceParams.name].url)
                host = restServiceParams.keyObj.config[restServiceParams.name].url;
            if (restServiceParams.version && restServiceParams.keyObj.config[restServiceParams.name] && restServiceParams.keyObj.config[restServiceParams.name].urls) {
                for (let i = 0; i < restServiceParams.keyObj.config[restServiceParams.name].urls.length; i++) {
                    if (restServiceParams.keyObj.config[restServiceParams.name].urls[i].version === restServiceParams.version)
                        host = restServiceParams.keyObj.config[restServiceParams.name].urls[i].url
                }
            }
        }
        return nextStep(host, restServiceParams.registry.port, true);
    }
    else {
        req.soajs.awareness.getHost(restServiceParams.name, restServiceParams.version, function (host) {
            if (!host) {
                req.soajs.log.error('Unable to find any healthy host for service [' + restServiceParams.name + (restServiceParams.version ? ('@' + restServiceParams.version) : '') + ']');
                return req.soajs.controllerResponse(core.error.getError(133));
            }
            return nextStep(host, restServiceParams.registry.port);
        });
    }
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
 * Function that retrieves the dashboard access key and its ACL permissions from the public extkey provided for logged in users
 * @param req
 * @param res
 */
function returnKeyAndPermissions(req, res) {
    var tenant = req.soajs.tenant;

    if (req.soajs.uracDriver && req.soajs.uracDriver.getProfile() && req.soajs.uracDriver.getProfile().tenant) {
        tenant = req.soajs.uracDriver.getProfile().tenant;
    }

    if (req.soajs.tenant.locked) {
        tenant.locked = req.soajs.tenant.locked;
    }

    //if saas mode and inputs contain project value, append it to tenant object
    if (process.env.SOAJS_SAAS && req.query && req.query.soajs_project && req.query.soajs_project !== '') {
        req.soajs.log.debug("detected saas project", req.query.soajs_project);
        tenant.soajs_project = req.query.soajs_project;
    }

    findExtKey(tenant, function (error, data) {
        if (error) {
            req.soajs.log.error(error);
            return req.soajs.controllerResponse(core.error.getError(135));
        }
        req.soajs.log.debug("Switching tenant to:", data);
        findKeyPermissions(function (error, info) {
            if (error) {
                req.soajs.log.error(error);
                return req.soajs.controllerResponse(core.error.getError(135));
            }

            for (let i in info) {
                data[i] = info[i];
            }
            req.soajs.log.debug("Tenant Permitted to:", data);
            return req.soajs.controllerResponse(data);
        });
    });

    function findExtKey(tenant, cb) {
        core.provision.getEnvironmentExtKeyWithDashboardAccess(tenant, cb);
    }

    function findKeyPermissions(cb) {
        //let ACL = null;
        let ACL = req.soajs.uracDriver.getAclAllEnv();

        let resume = () => {
            let tenant = req.soajs.tenant;
            if (!ACL) {
                ACL = (tenant.application.acl_all_env) ? tenant.application.acl_all_env : tenant.application.package_acl_all_env;

                //old system acl schema
                if (!ACL) {
                    ACL = (tenant.application.acl) ? tenant.application.acl : tenant.application.package_acl;
                }
            }

            core.registry.getAllRegistriesInfo(function (error, environments) {
                if (error) {
                    return cb(error);
                }

                var envInfo = core.provision.getEnvironmentsFromACL(ACL, environments);
                return cb(null, {"acl": ACL, "environments": envInfo});
            });
        };
        resume();
        /*
            if (uracACL) {
                provision.getPackageData(uracACL, (error, pack) => {
                    if (pack && pack.acl_all_env)
                        ACL = pack.acl_all_env;
                    resume();
                });
            }
            else
                resume();
        */
    }
}