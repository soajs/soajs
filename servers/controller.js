'use strict';

var http = require('http');
var core = require('./../modules/soajs.core/index.js');

var cors_mw = require('./../mw/cors/index');
var soajs_mw = require('./../mw/soajs/index');
var response_mw = require('./../mw/response/index');
var controller_mw = require('./../mw/controller/index');

/**
 *
 */
function controller() {
    var _self = this;
    _self.awareness = true;
    _self.serviceName = "controller";
    core.getRegistry(_self.serviceName, null, _self.awareness, function (reg) {
        _self.registry = reg;

        _self.log = core.getLogger(_self.serviceName, _self.registry.serviceConfig.logger);
        _self.server = http.createServer(function (req, res) {
            if (req.url === '/favicon.ico') {
                res.writeHead(200, {'Content-Type': 'image/x-icon'});
                res.end();
                return;
            }
            soajs_mw({
                "serviceName": _self.serviceName,
                "log": _self.log,
                "registry": _self.registry
            })(req, res, function () {
                cors_mw()(req, res, function () {
                    response_mw({"controllerResponse": true})(req, res, function () {
                        controller_mw()(req, res, function () {
                            var body = '';

                            req.on("data", function (chunk) {
                                body += chunk;
                            });

                            /* Close the connection */
                            req.on("end", function () {
                                process.nextTick(function () {
                                    try {
                                        req.soajs.controller.gotoservice(req, res, body);
                                    } catch (err) {
                                        return req.soajs.controllerResponse(core.error.getError(136));
                                    }
                                });
                            });


                            req.on("error", function (error) {
                                req.soajs.log.error("Error @ controller:", error);
                                if (req.soajs.controller.redirectedRequest) {
                                    req.soajs.controller.redirectedRequest.abort();
                                }
                            });

                            req.on("close", function () {
                                if (req.soajs.controller.redirectedRequest) {
                                    req.soajs.log.info("Request aborted:", req.url);
                                    req.soajs.controller.redirectedRequest.abort();
                                }
                            });
                        });
                    });
                });
            });
        });

        _self.serverMaintenance = http.createServer(function (req, res) {
            if (req.url === '/reloadRegistry') {
                core.reloadRegistry(_self.serviceName, null, _self.awareness, function (reg) {
                    res.writeHead(200, {'Content-Type': 'application/json'});
                    res.end(JSON.stringify(reg));
                    return;
                });
            }

            var heartbeat = function (res) {
                res.writeHead(200, {'Content-Type': 'application/json'});
                var response = {
                    'result': true,
                    'ts': Date.now(),
                    'service': {
                        'service': _self.serviceName.toUpperCase(),
                        'type': 'rest',
                        'route': '/heartbeat'
                    }
                };
                res.end(JSON.stringify(response));
            }
            if (req.url === '/heartbeat') {
                return heartbeat(res);
            }

            return heartbeat(res);
        });

    });
}

/**
 *
 */
controller.prototype.start = function (cb) {
    var _self = this;
    var maintenancePort = _self.registry.services.controller.port + _self.registry.serviceConfig.maintenancePortInc;
    _self.server.on('error', function (err) {
        if (err.code === 'EADDRINUSE') {
            _self.log.error('Address [port: ' + _self.registry.services.controller.port + '] in use by another service, exiting');
        }
        else
            _self.log.error(err);
    });
    _self.server.listen(_self.registry.services.controller.port, function (err) {
        if (err) {
            _self.log.error(err);
        }
        else
            _self.log.info(_self.serviceName + " service started on port: " + _self.registry.services.controller.port);
        if (cb) {
            cb(err);
        }
    });
    _self.serverMaintenance.on('error', function (err) {
        if (err.code === 'EADDRINUSE') {
            _self.log.error('Address [port: ' + (maintenancePort) + '] in use by another service, exiting');
        }
        else
            _self.log.error(err);
    });
    _self.serverMaintenance.listen(maintenancePort, function (err) {
        if (err) {
            _self.log.error(err);
        }
        else
            _self.log.info(_self.serviceName + " service maintenance is listening on port: " + maintenancePort);
    });

};


controller.prototype.stop = function (cb) {
    var _self = this;
    _self.log.info('stopping controllerServer on port:', _self.registry.services.controller.port);
    _self.server.close(function (err) {
        self.serverMaintenance.close(function (err) {
            if (cb) {
                cb(err);
            }
        });
    });
};

module.exports = controller;