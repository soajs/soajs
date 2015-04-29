'use strict';

var domain = require('domain');
var url = require('url');
var request = require('request');

var core = require('../../modules/soajs.core');
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

        var parameters = extractBuildParameters(req, parsedUrl.pathname.split('/')[1], parsedUrl.path);
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

        if (parameters.extKeyRequired) {
            var key = req.headers.key || parsedUrl.query.key;
            if (!key) {
                return req.soajs.controllerResponse(core.error.getError(132));
            }
            core.key.getInfo(key, req.soajs.registry.serviceConfig.key, function (err, keyObj) {
                if (err) {
                    return req.soajs.controllerResponse(core.error.getError(132));
                }
                if (!req.headers.key) {
                    req.headers.key = key;
                }

                req.soajs.controller.gotoservice = redirectToService;

                next();
            });
        }
        else {
            req.soajs.controller.gotoservice = redirectToService;
            next();
        }
    };
};

/**
 *
 * @param req
 * @param service
 * @param url
 * @returns {*}
 */
function extractBuildParameters(req, service, url) {
    if (service && req.soajs.registry && req.soajs.registry.services && req.soajs.registry.services[service] && req.soajs.registry.services[service].port && req.soajs.registry.services[service].hosts) {
        req.soajs.registry.services[service].url = url.substring(service.length + 1);
        req.soajs.registry.services[service].name = service;
        return req.soajs.registry.services[service];
    }
    return null;
}

/**
 *
 * @param req
 * @param res
 * @param body
 * @returns {*}
 */
function redirectToService(req, res, body) {
    var restServiceParams = req.soajs.controller.serviceParams;
    var config = req.soajs.registry.services.controller;
    if (!config) {
        return req.soajs.controllerResponse(core.error.getError(131));
    }
    var requestTOR = restServiceParams.requestTimeoutRenewal || config.requestTimeoutRenewal;
    var requestTO = restServiceParams.requestTimeout || config.requestTimeout;

    req.soajs.awareness.getHost(restServiceParams.name, function (host) {
        if (!host) {
            req.soajs.log.error('Unable to find any healthy host for service [' + restServiceParams.name + ']');
            return req.soajs.controllerResponse(core.error.getError(133));
        }
        var requestOptions = {
            'method': req.method,
            'uri': 'http://' + host + ':' + restServiceParams.port + restServiceParams.url,
            'timeout': 1000 * 3600,
            'pool': config.maxPoolSize,
            'headers': req.headers,
            'jar': false
        };
        req.soajs.log.info({
            "serviceName": restServiceParams.name,
            "host": host,
            "url": restServiceParams.url,
            "header": req.headers,
            "body": body
        });

        req.soajs.controller.renewalCount = 0;
        res.setTimeout(requestTO * 1000, function () {
            req.soajs.log.warn('Request is taking too much time ...');
            req.soajs.controller.renewalCount++;
            if (req.soajs.controller.renewalCount <= requestTOR) {
                req.soajs.log.info('Trying to keep request alive by checking the service heartbeat ...');
                request({
                    'uri': 'http://' + host + ':' + (restServiceParams.port + req.soajs.registry.serviceConfig.ports.maintenanceInc) + '/heartbeat',
                    'headers': req.headers
                }, function (error, response, body) {
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

        if (req.method === 'POST' || req.method === 'PUT') {
            requestOptions.body = body || "{}";
            if (requestOptions.headers['content-length'] === '0') {
                requestOptions.headers['content-length'] = requestOptions.body.length;
            }
        }

        if (config.authorization) {
            isRequestAuthorized(req, requestOptions, body);
        }

        req.soajs.controller.redirectedRequest = request(requestOptions);
        req.soajs.controller.redirectedRequest.on('error', function (err) {
            req.soajs.log.error(err);
            return req.soajs.controllerResponse(core.error.getError(135));
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
 * @param requestOptions
 * @param body
 * @returns {boolean}
 */
function isRequestAuthorized(req, requestOptions, body) {
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