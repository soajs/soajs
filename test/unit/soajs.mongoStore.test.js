"use strict";
var assert = require('assert');
var session = require('express-session');

var helper = require("../helper.js");
var core = helper.requireModule("./modules/soajs.core/index");
var soajsmongoStore = helper.requireModule('./modules/soajs.mongoStore');

describe("mongoStore tests", function() {
	var MongoStore = soajsmongoStore(session);
	//var registry = core.getRegistry();
	var store = new MongoStore({
        "name": "core_session",
        "prefix": "",
        "servers": [
            {
                "host": "127.0.0.1",
                "port": 27017
            }
        ],
        "credentials": null,
        "URLParam": {
            "connectTimeoutMS": 0,
            "socketTimeoutMS": 0,
            "maxPoolSize": 5,
            "wtimeoutMS": 0,
            "slaveOk": true
        },
        "extraParam": {
            "db": {
                "native_parser": true
            },
            "server": {
                "auto_reconnect": true
            }
        },
        'store': {},
        "collection": "sessions",
        'stringify': false,
        'expireAfter': 1000 * 60 * 60 * 24 * 14 // 2 weeks
    });

	describe("testing get", function() {
		it("fail - no sid provided", function(done) {
			store.get(null, function(error, data) {
				assert.ok(!error);
				assert.ok(!data);
				done();
			});
		});

		it("fail - invalid sid provided", function(done) {
			store.get("abcdef", function(error, data) {
				assert.ok(!error);
				assert.ok(!data);
				done();
			});
		});

		it("fail - empty sid provided", function(done) {
			store.get("", function(error, data) {
				assert.ok(!error);
				assert.ok(!data);
				done();
			});
		});

	});

	describe("testing clear & length", function(){
		it('success test case',function(done){
			store.clear(function(error){
				assert.ifError(error);
				done();
			});
		});

		it('success test case',function(done){
			store.length(function(error, count){
				assert.ifError(error);
				assert.equal(count , 0);
				done();
			});
		});
	});

});