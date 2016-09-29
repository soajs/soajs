"use strict";
var assert = require('assert');
var helper = require("../helper.js");
var soajsES= helper.requireModule('./index.js').es;

describe("testing connection", function() {
	var es;

	it("invalid credentials all requests should fail", function(done) {
		es = new soajsES();
		es.checkIndex('demo', function(error, response) {
			assert.ok(error);
			assert.ok(!response);
			assert.ok(error.message);

			es.checkIndex('demo', function(error, response){
				assert.ok(error);
				assert.ok(!response);
				assert.ok(error.message);

				es.createIndex('demo', function(error, response){
					assert.ok(error);
					assert.ok(!response);
					assert.ok(error.message);

					var data = [
						{
							"firstname": "john",
							"lastname": "doe"
						}
					];
					es.bulk(data, function(error, response){
						assert.ok(error);
						assert.ok(!response);
						assert.ok(error.message);

						es.deleteIndex('demo', function(error, response){
							assert.ok(error);
							assert.ok(!response);
							assert.ok(error.message);
							done();
						});
					});
				});
			});
		});

	});
});

describe("TESTING soajs.mongo", function() {
	var es = null;
	var dbConfig = {
		"name": 'es',
		"prefix": "",
		"servers": [
			{
				"host": "127.0.0.1",
				"port": "9200"
			}
		],
		"credentials": null,
		"URLParam": {
			"protocol": "http"
		},
		"extraParam": {
			"requestTimeout": 30000,
			"keepAlive": true,
			"maxSockets": 300,
			"number_of_shards": 5,
			"number_of_replicas": 1
		},
		"registryLocation": {"env": process.env.SOAJS_ENV.toLowerCase(), "l1": "coreDB", "l2": "es"}
	};
	before(function(done) {
		es = new soajsES(dbConfig);
		done();
	});

	after(function(done) {
		es.close();
		done();
	});

	describe("testing ping", function() {

		it("success - ping worked", function(done) {
			es.ping(function(error, response) {
				assert.ifError(error);
				assert.ok(response);
				done();
			});
		});
	});

	describe("testing check index", function() {

		it("fail - no indexName", function(done) {
			es.checkIndex(null, function(error) {
				assert.ok(error);
				assert.ok(error.message);
				done();
			});
		});

		it("success - Index doesn't exists but no errors", function(done) {
			es.checkIndex("demo", function(error, response) {
				assert.ifError(error);
				assert.ok(!response);
				done();
			});
		});
	});

	describe("testing create index", function() {

		it("fail - no indexName", function(done) {
			es.createIndex(null, function(error) {
				assert.ok(error);
				assert.ok(error.message);
				done();
			});
		});

		it('success - will create index', function(done) {
			es.createIndex("demo1", function(error, response) {
				assert.ifError(error);
				assert.ok(response);
				done();
			});
		});

		it('success - will create index with mapping', function(done) {
			var mapping = {
				"users":{
					"properties":{
						"firstName": {
							"type": "string"
						},
						"lastName": {
							"type": "string"
						}
					}
				}
			};
			es.createIndex("demo2", mapping, function(error, response) {
				assert.ifError(error);
				assert.ok(response);
				done();
			});
		});

		it('success - will create index with mapping and settings', function(done) {
			var mapping = {
				"users":{
					"properties":{
						"firstName": {
							"type": "string"
						},
						"lastName": {
							"type": "string"
						}
					}
				}
			};

			var settings = {
				"number_of_shards": 2,
				"number_of_replicas": 1
			};
			es.createIndex("demo3", mapping, settings, function(error, response) {
				assert.ifError(error);
				assert.ok(response);
				done();
			});
		});
	});

	describe("testing bulk", function() {

		it("fail - no data", function(done) {
			es.bulk(null, function(error) {
				assert.ok(error);
				assert.ok(error.message);
				done();
			});
		});

		it("fail - invalid data", function(done) {
			es.bulk({ "username": "john", "lastname": "doe"}, function(error) {
				assert.ok(error);
				assert.ok(error.message);
				done();
			});
		});

		it('success - all working', function(done) {
			var data = [
				{index: {_index: "demo3", _type: "users"}},
				{ "username": "john", "lastname": "doe"}
			];
			es.bulk(data, function(error, response) {
				assert.ifError(error);
				assert.ok(response);
				done();
			});
		});

		it('success - all working again', function(done) {
			var data = [
				{index: {_index: "demo3", _type: "users"}},
				{ "username": "jane", "lastname": "doe"}
			];
			var es2 = new soajsES(dbConfig);
			es2.bulk(data, function(error, response) {
				assert.ifError(error);
				assert.ok(response);
				done();
			});
		});
	});

	describe("testing delete index", function() {

		it("fail - no index name", function(done) {
			es.deleteIndex(null, function(error) {
				assert.ok(error);
				assert.ok(error.message);
				done();
			});
		});

		it('success - Indexes deleted', function(done) {
			es.deleteIndex('demo1', function(error, record) {
				assert.ifError(error);
				assert.ok(record);

				es.deleteIndex('demo2', function(error, record) {
					assert.ifError(error);
					assert.ok(record);

					es.deleteIndex('demo3', function(error, record) {
						assert.ifError(error);
						assert.ok(record);
						done();
					});
				});
			});
		});
	});
});