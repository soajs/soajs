"use strict";
var assert = require('assert');
var helper = require("../helper.js");
var soajs = helper.requireModule('index.js');

var requester = helper.requester;

describe('Testing helloDaemon', function() {
    var daemon = new soajs.server.daemon({
        "config": {
            serviceName: "helloDaemon",
            "serviceVersion": 1,
            servicePort: 4200,
            "errors": {},
            "schema": {
                "hello": {
                    "l": "hello world"
                }
            }
        }
    });

    before(function(done) {
        daemon.init(function() {
            daemon.job("hello", function(soajs, next) {
                soajs.log.info ("HELLO daemon");
                // console.log ("*************************");
                // console.log(soajs.servicesConfig);
                next();
            });
            daemon.start(function(err){
                assert.ifError(err);
                setTimeout(function() {
                    done();
                }, 500);
            });
        });
    });
    after(function(done) {
        daemon.stop(function(err) {
            assert.ifError(err);
            done();
        });
    });
    it('Testing /helloDaemon/heartbeat', function(done) {
        requester('get', {
            uri: 'http://localhost:5200/heartbeat'
        }, function(err, body, response) {
            assert.ifError(err);
            assert.equal(response.statusCode, 200);
            delete body.ts;
            assert.deepEqual(body, {
                "result": true,
                "service": {"service": "HELLODAEMON", "type": "daemon", "route": "/heartbeat"}
            });
            done();
        });
    });
    it('Testing /helloDaemon/daemonStats', function(done) {
        requester('get', {
            uri: 'http://localhost:5200/daemonStats'
        }, function(err, body, response) {
            assert.ifError(err);
            assert.equal(response.statusCode, 200);
            assert.ok(body);
            assert.deepEqual(body.result, true);
            done();
        });
    });
	
	it('Testing /helloDaemon/reloadDaemonConf', function(done) {
		requester('get', {
			uri: 'http://localhost:5200/reloadDaemonConf'
		}, function(err, body, response) {
			assert.ifError(err);
			assert.equal(response.statusCode, 200);
			assert.ok(body);
			assert.deepEqual(body.result, true);
			done();
		});
	});
	
	it('Testing /helloDaemon/loadProvision', function(done) {
		requester('get', {
			uri: 'http://localhost:5200/loadProvision'
		}, function(err, body, response) {
			assert.ifError(err);
			assert.equal(response.statusCode, 200);
			assert.ok(body);
			assert.deepEqual(body.result, true);
			done();
		});
	});
	
	it('Testing /helloDaemon/heartbeat', function(done) {
		requester('get', {
			uri: 'http://localhost:5200/'
		}, function(err, body, response) {
			assert.ifError(err);
			assert.equal(response.statusCode, 200);
			assert.ok(body);
			assert.deepEqual(body.result, true);
			done();
		});
	});
});