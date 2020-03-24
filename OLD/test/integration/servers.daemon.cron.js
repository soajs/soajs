"use strict";
var assert = require('assert');
var helper = require("../helper.js");
var soajs = helper.requireModule('index.js');

var requester = helper.requester;

describe('Testing hellodaemoncron', function() {
    var daemon = new soajs.server.daemon({
        "config": {
            serviceName: "hellodaemoncron",
            "serviceVersion": 1,
            servicePort: 4201,
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
                soajs.log.info ("HELLO daemon CRON");
                console.log ("*************************");
                console.log(soajs.servicesConfig);
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
});