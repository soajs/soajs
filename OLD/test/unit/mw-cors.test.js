"use strict";
var assert = require('assert');
var helper = require("../helper.js");
var cors = helper.requireModule('./mw/cors');

describe("testing cors", function() {

	it("testing with method options", function(done) {
		var req = {
			method: 'options',
			soajs: {
				registry: {"serviceConfig": {
                    "cors": {
                        "enabled": true,
                        "origin": '*',
                        "credentials": 'true',
                        "methods": 'GET,HEAD,PUT,PATCH,POST,DELETE',
                        "headers": 'key,soajsauth,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type',
                        "maxage": 1728000
                    }}}
			}
		};

		var res = {
			setHeader: function(header, value) {
				if(!res.headers) {
					res.headers = {};
				}
				res.headers[header] = value;
			},
			end: function() {
				callback();
			}
		};

		function callback() {
			assert.ok(res.headers);
			assert.deepEqual(res.headers, {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Credentials': 'true',
				'Access-Control-Allow-Methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
				'Access-Control-Allow-Headers': 'key,soajsauth,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type',
				'Access-Control-Max-Age': 1728000
			});
			assert.ok(res.statusCode);
			assert.equal(res.statusCode, 204);
			done();
		}

		cors()(req, res);
	});

	it('testing without soajs', function(done) {

		var req = {
			next: false
		};

		var res = function() {
			req.next = true;
		};

		function callback() {
			assert.ok(!req.next);
			done();
		}

		cors()(req, res, callback);
	});
});