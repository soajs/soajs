'use strict';

var path = require('path');

var provision = require("./../modules/soajs.provision/index.js");
var core = require("./../modules/soajs.core/index.js");

var lib = require("./../lib/index");

var express = require("./../classes/express");

var _log = null;
/*
 * param = {
 *           logger : boolean
 *           bodyParser : boolean
 *           methodOverride : boolean
 *           cookieParser : boolean
 *           inputmask : boolean
 *
 *           session : boolean
 *           security : boolean
 *           multitenant: boolean
 *           acl: boolean
 *
 *           config : object
 *         }
 */
/**
 *
 * @param param
 */
function service(param) {
    var defaultParam = ["bodyParser", "methodOverride", "cookieParser", "logger", "inputmask"];
    var len = defaultParam.length;
    for (var i = 0; i < len; i++) {
        if (!param.hasOwnProperty(defaultParam[i])) {
            param[defaultParam[i]] = true;
        }
    }
    var soajs = {};
    soajs.serviceName = param.serviceName || param.config.serviceName;
    var registry = core.getRegistry();
    soajs.serviceConf = lib.registry.getServiceConf(soajs.serviceName, registry);
    soajs.provision = registry.coreDB.provision;

    _log = core.getLogger(soajs.serviceName, registry.serviceConfig.logger);

    if (!soajs.serviceName || !soajs.serviceConf) {
        _log.error('Service failed to start because soajs.serviceName is [' + soajs.serviceName + ']');
        return;
    }

    this.app = express();
    this.appMaintenance = express();
    var self = this;

    this.app.all('*', function (req, res, next) {
        if (req.url === '/favicon.ico') {
            res.writeHead(200, {'Content-Type': 'image/x-icon'});
            return res.end();
        }
        else
            return next();
    });

    if (param.logger) {
        var logger = require('morgan');
        this.app.use(logger('combined'));
    }
    var soajs_mw = require("./../mw/soajs/index");
    this.app.use(soajs_mw({"registry": registry, "log": _log}));
    this.appMaintenance.use(soajs_mw({"registry": registry, "log": _log}));

    var response_mw = require("./../mw/response/index");
    this.app.use(response_mw({}));
    this.appMaintenance.use(response_mw({}));

    if (param.bodyParser) {
        var bodyParser = require('body-parser');
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({extended: true}));
    }

    if (param.methodOverride) {
        var methodOverride = require('method-override');
        this.app.use(methodOverride());
    }

    if (param.cookieParser) {
        var cookieParser = require('cookie-parser');
        this.app.use(cookieParser(soajs.serviceConf._conf.cookie.secret));
    }

    if (param.session) {
        var session = require('express-session');
        var MongoStore = require('./../modules/soajs.mongoStore/index.js')(session);
        var store = new MongoStore(registry.coreDB.session);
        var sessConf = {};
        for (var key in soajs.serviceConf._conf.session) {
            if (soajs.serviceConf._conf.session.hasOwnProperty(key)) {
                sessConf[key] = soajs.serviceConf._conf.session[key];
            }
        }
        sessConf.store = store;
        this.app.use(session(sessConf));
    }

    if (param.inputmask && param.config.schema) {
        var inputmask_mw = require("./../mw/inputmask/index");
        var inputmaskSrc = ["params", "headers", "query"];
        if (param.cookieParser) {
            inputmaskSrc.push("cookies");
        }
        if (param.bodyParser) {
            inputmaskSrc.push("body");
        }

        soajs.inputmask = inputmask_mw(param.config, inputmaskSrc);
    }

    if (param.bodyParser && param.oauth) {
        var oauthserver = require('oauth2-server');
        this.oauth = oauthserver({
            model: provision.oauthModel,
            grants: registry.serviceConfig.oauth.grants,
            debug: registry.serviceConfig.oauth.debug
        });

        soajs.oauthService = param.oauthService || {"name": "oauth", "tokenApi": "/token"};
        if (!soajs.oauthService.name)
            soajs.oauthService.name = "oauth";
        if (!soajs.oauthService.tokenApi)
            soajs.oauthService.tokenApi = "/token";

        soajs.oauth = this.oauth.authorise();
    }

    var service_mw = require("./../mw/service/index");
    this.app.use(service_mw({"soajs": soajs, "app": self.app, "param": param}));

    this.app.soajs = soajs;
}

/**
 *
 */
service.prototype.start = function (cb) {
    if (this.app && this.app.soajs) {

        this.app.all('*', function (req, res) {
            req.soajs.log.error(151, 'Unknown API : ' + req.path);
            res.jsonp(req.soajs.buildResponse(core.error.getError(151)));
        });

        this.app.use(logErrors);
        this.app.use(clientErrorHandler);
        this.app.use(errorHandler);

        var self = this;

        provision.init(this.app.soajs.provision, _log);
        provision.loadProvision(function (loaded) {
            if (loaded) {
                self.app.httpServer = self.app.listen(self.app.soajs.serviceConf.info.port, function (err) {
                    if (cb) {
                        cb(err);
                    }
                });

                //MAINTENANCE Service Routes
                var maintenanceResponse = function (req) {
                    var response = {
                        'result': false,
                        'ts': Date.now(),
                        'service': {
                            'service': self.app.soajs.serviceName,
                            'type': 'rest',
                            'route': req.path
                        }
                    };
                    return response;
                };
                self.appMaintenance.get("/heartbeat", function (req, res) {
                    var response = maintenanceResponse(req);
                    response['result'] = true;
                    res.jsonp(response);
                });

                self.appMaintenance.get("/reloadRegistry", function (req, res) {
                    var newRegistry = core.reloadRegistry();
                    var response = maintenanceResponse(req);
                    response['result'] = true;
                    response['data'] = newRegistry;
                    res.jsonp(response);
                });
                self.appMaintenance.get("/loadProvision", function (req, res) {
                    provision.loadProvision(function (loaded) {
                        var response = maintenanceResponse(req);
                        response['result'] = loaded;
                        res.jsonp(response);
                    });
                });
                self.appMaintenance.get("/generateExtKey/:iKey", function (req, res) {
                    var key = req.params.iKey;//"d1eaaf5fdc35c11119330a8a0273fee9";
                    provision.generateExtKey(key, req.soajs.registry.serviceConfig.key, function (err, data) {
                        var response = maintenanceResponse(req);
                        if (!err) {
                            response['result'] = true;
                            response['data'] = data;
                        }
                        res.jsonp(response);
                    });
                });
                self.appMaintenance.get("/getTenantKeys/:tId", function (req, res) {
                    var tId = req.params.tId;//"10d2cb5fc04ce51e06000001";
                    provision.getTenantKeys(tId, function (err, data) {
                        var response = maintenanceResponse(req);
                        if (!err) {
                            response['result'] = true;
                            response['data'] = data;
                        }
                        res.jsonp(response);
                    });
                });
                self.appMaintenance.all('*', function (req, res) {
                    var response = {
                        'result': false,
                        'ts': Date.now(),
                        'service': {
                            'service': self.app.soajs.serviceName,
                            'type': 'rest',
                            'route': req.url
                        },
                        'error': 'Unknown API : ' + req.path
                    };
                    res.jsonp(response);
                });
                self.appMaintenance.httpServer = self.appMaintenance.listen(self.app.soajs.serviceConf.info.port + self.app.soajs.serviceConf._conf.maintenancePortInc); //For internal use only
            }
        });
    } else {
        cb(new Error('Failed starting service'));
    }
};

service.prototype.stop = function (cb) {
    _log.info('stopping service[' + this.app.soajs.serviceName + '] on port:', this.app.soajs.serviceConf.info.port);
    var self = this;
    self.app.httpServer.close(function (err) {
        self.appMaintenance.httpServer.close(function (err) {
            if (cb) {
                cb(err);
            }
        });
    });
};

//-------------------------- ROUTES support
/**
 *
 * @param restApp
 * @param args
 * @returns {*}
 */
function injectOauth(restApp, args) {
    if (restApp.app.soajs.oauthService && restApp.app.soajs.serviceName === restApp.app.soajs.oauthService.name && args[0] === restApp.app.soajs.oauthService.tokenApi)
        return args;

    var oauthModelInjection = function (req, res, next) {
        if (req.soajs) {
            provision.getOauthToken(req.query.access_token, function (err, record) {
                restApp.oauth.model["getAccessToken"] = function (bearerToken, callback) {
                    if (record && record.oauthAccessToken) {
                        if (record.oauthAccessToken.accessToken === bearerToken) {
                            return callback(false, record.oauthAccessToken);
                        }
                    }
                    return callback(false, false);
                };
                restApp.oauth.model["getRefreshToken"] = function (bearerToken, callback) {
                    if (record && record.oauthRefreshToken) {
                        if (record.oauthRefreshToken.refreshToken === bearerToken) {
                            return callback(false, record.oauthRefreshToken);
                        }
                    }
                    return callback(false, false);
                };
                return next();
            });
        }
        else {
            return next();
        }
    };

    if (restApp.app.soajs.oauth) {
        var len = args.length;
        var argsNew = [];
        argsNew.push(args[0]);
        argsNew.push(oauthModelInjection);
        argsNew.push(restApp.app.soajs.oauth);
        for (var i = 1; i < len; i++) {
            argsNew[i + 2] = args[i];
        }

        return argsNew;
    }
    return args;
}
/**
 *
 * @param restApp
 * @param args
 * @returns {*}
 */
function injectInputmask(restApp, args) {
    if (restApp.app.soajs.inputmask) {
        var len = args.length;
        var argsNew = [];
        argsNew.push(args[0]);
        argsNew.push(restApp.app.soajs.inputmask);
        for (var i = 1; i < len; i++) {
            argsNew[i + 1] = args[i];
        }
        return argsNew;
    }
    return args;
}
/**
 *
 * @param app
 * @returns {boolean}
 */
function isSOAJready(app) {
    if (app && app.soajs)
        return true;
    _log.info("Can't attach route because soajs express app is not defined");
    return false;
}
/**
 *
 */
service.prototype.all = function () {
    if (!isSOAJready(this.app)) return;
    var args = injectOauth(this, arguments);
    args = injectInputmask(this, args);
    this.app.all.apply(this.app, args);
};
/**
 *
 */
service.prototype.get = function () {
    if (!isSOAJready(this.app)) return;
    var args = injectOauth(this, arguments);
    args = injectInputmask(this, args);
    this.app.get.apply(this.app, args);
};
/**
 *
 */
service.prototype.post = function () {
    if (!isSOAJready(this.app)) return;
    var args = injectOauth(this, arguments);
    args = injectInputmask(this, args);
    this.app.post.apply(this.app, args);
};

/**
 *
 */
service.prototype.put = function () {
    if (!isSOAJready(this.app)) return;
    var args = injectOauth(this, arguments);
    args = injectInputmask(this, args);
    this.app.put.apply(this.app, args);
};
/**
 *
 */
service.prototype.delete = function () {
    if (!isSOAJready(this.app)) return;
    var args = injectOauth(this, arguments);
    args = injectInputmask(this, args);
    this.app.delete.apply(this.app, args);
};


//-------------------------- ERROR Handling MW
/**
 *
 * @param err
 * @param req
 * @param res
 * @param next
 */
function logErrors(err, req, res, next) {
    if (typeof err === "number") {
        req.soajs.log.error(core.error.generate(err));
        return next(err);
    }
    if (typeof err === "object") {
        if (err.code && err.message) {
            req.soajs.log.error(err);
            return next({"code": err.code, "msg": err.message});
        }
        else {
            req.soajs.log.error(err);
            req.soajs.log.error(core.error.generate(164));
        }
    }
    else {
        req.soajs.log.error(err);
        req.soajs.log.error(core.error.generate(164));
    }

    return next(core.error.getError(164));
}
/**
 *
 * @param err
 * @param req
 * @param res
 * @param next
 */
function clientErrorHandler(err, req, res, next) {
    if (req.xhr) {
        req.soajs.log.error(core.error.generate(150));
        res.status(500).send(req.soajs.buildResponse(core.error.getError(150)));
    } else {
        return next(err);
    }
}
/**
 *
 * @param err
 * @param req
 * @param res
 * @param next
 */
function errorHandler(err, req, res, next) {
    res.status(500);
    if (err.code && err.msg) {
        res.jsonp(req.soajs.buildResponse(err));
    } else {
        res.jsonp(req.soajs.buildResponse(core.error.getError(err)));
    }
}

module.exports = service;