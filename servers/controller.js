'use strict';

var connect = require('connect');
var http = require('http');
var request = require('request');
var core = require('./../modules/soajs.core/index.js');

var favicon_mw = require('./../mw/favicon/index');
var cors_mw = require('./../mw/cors/index');
var soajs_mw = require('./../mw/soajs/index');
var response_mw = require('./../mw/response/index');
var awareness_mw = require('./../mw/awareness/index');
var controller_mw = require('./../mw/controller/index');

/**
 *
 */
function controller(param) {
	var _self = this;
	_self.awareness = true;
	_self.serviceAwarenessObj = {};
	_self.serviceName = "controller";
	_self.serviceIp = (param && param.serviceIp) ? param.serviceIp : "127.0.0.1";
}

controller.prototype.init = function(callback) {
	var _self = this;
	core.getRegistry({"serviceName": _self.serviceName, "apiList": null, "awareness": _self.awareness, "serviceIp": _self.serviceIp}, function(reg) {
		_self.registry = reg;
		_self.log = core.getLogger(_self.serviceName, _self.registry.serviceConfig.logger);

		var app = connect();
		app.use(favicon_mw());
		app.use(soajs_mw({
			"serviceName": _self.serviceName,
			"log": _self.log,
			"registry": _self.registry
		}));
		app.use(cors_mw());
		app.use(response_mw({"controllerResponse": true}));
		app.use(awareness_mw({
			"awareness": _self.awareness,
			"serviceName": _self.serviceName,
			"registry": _self.registry,
			"log": _self.log,
			"serviceIp": _self.serviceIp
		}));
		app.use(controller_mw());
		app.use(function(req, res, next) {
			var body = '';

			req.on("data", function(chunk) {
				body += chunk;
			});

			/* Close the connection */
			req.on("end", function() {
				process.nextTick(function() {
					try {
						req.soajs.controller.gotoservice(req, res, body);
					} catch(err) {
						_self.log.error(err);
						return req.soajs.controllerResponse(core.error.getError(136));
					}
				});
			});


			req.on("error", function(error) {
				req.soajs.log.error("Error @ controller:", error);
				if(req.soajs.controller.redirectedRequest) {
					req.soajs.controller.redirectedRequest.abort();
				}
			});

			req.on("close", function() {
				if(req.soajs.controller.redirectedRequest) {
					req.soajs.log.info("Request aborted:", req.url);
					req.soajs.controller.redirectedRequest.abort();
				}
			});

			next();
		});

		_self.server = http.createServer(app);
		_self.serverMaintenance = http.createServer(function(req, res) {
			if(req.url === '/reloadRegistry') {
				core.reloadRegistry({"serviceName": _self.serviceName, "apiList": null, "awareness": _self.awareness, "serviceIp": _self.serviceIp}, function(reg) {
					res.writeHead(200, {'Content-Type': 'application/json'});
					return res.end(JSON.stringify(reg));
				});
			}

			var heartbeat = function(res) {
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
			};

			if(req.url === '/heartbeat') {
				return heartbeat(res);
			}

			return heartbeat(res);
		});

		callback();
	});
};

/**
 *
 */
controller.prototype.start = function(cb) {
	var _self = this;
	_self.init(function() {
		var maintenancePort = _self.registry.services.controller.port + _self.registry.serviceConfig.ports.maintenanceInc;
		_self.server.on('error', function(err) {
			if(err.code === 'EADDRINUSE') {
				_self.log.error('Address [port: ' + _self.registry.services.controller.port + '] in use by another service, exiting');
			}
			else {
				_self.log.error(err);
			}
		});
		_self.server.listen(_self.registry.services.controller.port, function(err) {
			if(err) {
				_self.log.error(err);
			}
			else {
				_self.log.info(_self.serviceName + " service started on port: " + _self.registry.services.controller.port);
			}
			if(cb && typeof cb === "function") {
				cb(err);
			}
		});
		_self.serverMaintenance.on('error', function(err) {
			if(err.code === 'EADDRINUSE') {
				_self.log.error('Address [port: ' + (maintenancePort) + '] in use by another service, exiting');
			}
			else {
				_self.log.error(err);
			}
		});
		_self.serverMaintenance.listen(maintenancePort, function(err) {
			if(err) {
				_self.log.error(err);
			}
			else {
				_self.log.info(_self.serviceName + " service maintenance is listening on port: " + maintenancePort);
			}
		});
	});
};


controller.prototype.stop = function(cb) {
	var _self = this;
	_self.log.info('stopping controllerServer on port:', _self.registry.services.controller.port);
	_self.server.close(function(err) {
		_self.serverMaintenance.close(function(err) {
			if(cb) {
				cb(err);
			}
		});
	});
};

module.exports = controller;