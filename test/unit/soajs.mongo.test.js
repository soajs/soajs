"use strict";
var assert = require('assert');
var helper = require("../helper.js");
var soajsMongo = helper.requireModule('./index.js').mongo;

describe("testing connection", function() {
	var mongo;

	it("invalid credentials all requests should fail", function(done) {
		var dbConfig = {
			"name": 'soajs_test_db',
			"prefix": "soajs_test_",
			"servers": [
				{
					"host": "127.0.0.1",
					"port": "27017"
				}
			],
			"credentials": {
				'username': 'admin',
				'password': 'admin'
			},
			"URLParam": {
				"connectTimeoutMS": 0,
				"socketTimeoutMS": 0,
				"maxPoolSize": 5,
				"w": 1,
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
		};

		mongo = new soajsMongo(dbConfig);
		mongo.find('myCollection', {}, function(error, response) {
			assert.ok(error);
			assert.ok(!response);
			assert.equal(error.message, 'auth failed');

			mongo.findOne('myCollection', {}, function(error, response) {
				assert.ok(error);
				assert.ok(!response);
				assert.equal(error.message, 'auth failed');
				mongo.insert('myCollection', {}, function(error, response) {
					assert.ok(error);
					assert.ok(!response);
					assert.equal(error.message, 'auth failed');
					mongo.save('myCollection', {}, function(error, response) {
						assert.ok(error);
						assert.ok(!response);
						assert.equal(error.message, 'auth failed');
						mongo.update('myCollection', {'a': 'b'}, {$set: {'a': 'c'}}, function(error, response) {
							assert.ok(error);
							assert.ok(!response);
							assert.equal(error.message, 'auth failed');
							mongo.count('myCollection', {'a': 'b'}, function(error, response) {
								assert.ok(error);
								assert.ok(!response);
								assert.equal(error.message, 'auth failed');
								mongo.ensureIndex('myCollection', {'a': 1}, null, function(error, response) {
									assert.ok(error);
									assert.ok(!response);
									assert.equal(error.message, 'auth failed');
									mongo.getCollection('myCollection', function(error, response) {
										assert.ok(error);
										assert.ok(!response);
										assert.equal(error.message, 'auth failed');
										mongo.remove('myCollection', {}, function(error, response) {
											assert.ok(error);
											assert.ok(!response);
											assert.equal(error.message, 'auth failed');
											mongo.findAndModify('myCollection', {'a': 'b'}, {a: 1}, {'a': 'c'}, function(error, response) {
												assert.ok(error);
												assert.ok(!response);
												assert.equal(error.message, 'auth failed');
												mongo.findAndRemove('myCollection', {'a': 'b'}, {a: 1}, function(error, response) {
													assert.ok(error);
													assert.ok(!response);
													assert.equal(error.message, 'auth failed');
													mongo.dropCollection('myCollection', function(error, response) {
														assert.ok(error);
														assert.ok(!response);
														assert.equal(error.message, 'auth failed');
														mongo.dropDatabase(function(error, response) {
															assert.ok(error);
															assert.ok(!response);
															assert.equal(error.message, 'auth failed');
															done();
														});
													});
												});
											});
										});
									});
								});
							});
						});
					});
				});
			});
		});
	});

	it("testing with no db name", function(done){
		var dbConfig = {
			"name": '',
			"prefix": "soajs_test_",
			"servers": [
				{
					"host": "127.0.0.1",
					"port": "27017"
				}
			],
			"credentials": null,
			"URLParam": {
				"connectTimeoutMS": 0,
				"socketTimeoutMS": 0,
				"maxPoolSize": 5,
				"w": 1,
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
		};

		mongo = new soajsMongo(dbConfig);
		mongo.find('myCollection',{},function(error){
			assert.ok(error);
			assert.ok(error.message);
			//assert.equal(error.message,'Unable to build needed url for mongo.connect.');
			console.log(error);
			done();
		});
	});
});

describe("TESTING soajs.mongo", function() {
	var mongo = null;
	before(function(done) {
		var dbConfig = {
			"name": 'soajs_test_db',
			"prefix": "soajs_test_",
			"servers": [
				{
					"host": "127.0.0.1",
					"port": "27017"
				}
			],
			"credentials": null,
			"URLParam": {
				"connectTimeoutMS": 0,
				"socketTimeoutMS": 0,
				"maxPoolSize": 5,
				"w": 1,
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
		};
		mongo = new soajsMongo(dbConfig);

		mongo.dropDatabase(function(error) {
			assert.ifError(error);
			done();
		});
	});

	after(function(done) {
		mongo.dropDatabase(function(error) {
			assert.ifError(error);
			done();
		});
	});

	describe("testing ensure index", function() {

		it("fail - no collectionName", function(done) {
			mongo.ensureIndex(null, null, null, function(error) {
				assert.ok(error);
				assert.ok(error.message);
				//assert.equal(error.message, 'Wrong input param form mongo function');
				done();
			});
		});

		it('success - all working', function(done) {
			mongo.ensureIndex("myCollection", {'username': 1}, null, function(error, response) {
				assert.ifError(error);
				assert.ok(response);
				done();
			});
		});
	});

	describe("testing get collection", function() {

		it("fail - no collectionName", function(done) {
			mongo.getCollection(null, function(error) {
				assert.ok(error);
				assert.ok(error.message);
				//assert.equal(error.message, 'Wrong input param form mongo function');
				done();
			});
		});

		it('success - all working', function(done) {
			mongo.getCollection("myCollection", function(error, response) {
				assert.ifError(error);
				assert.ok(response);
				done();
			});
		});
	});

	describe("testing insert", function() {

		it("fail - no collectionName", function(done) {
			mongo.insert(null, null, function(error) {
				assert.ok(error);
				assert.ok(error.message);
				//assert.equal(error.message, 'Wrong input param form mongo function');
				done();
			});
		});

		it("fail - no document", function(done) {
			mongo.insert("myCollection", null, function(error) {
				assert.ok(error);
				assert.ok(error.message);
				//assert.equal(error.message, 'Wrong input param form mongo function');
				done();
			});
		});

		it('success - all working', function(done) {
			mongo.insert("myCollection", {'a': 'b'}, function(error, response) {
				assert.ifError(error);
				assert.ok(response);
				done();
			});
		});
	});

	describe("testing save", function() {

		it("fail - no collectionName", function(done) {
			mongo.save(null, null, function(error) {
				assert.ok(error);
				assert.ok(error.message);
				//assert.equal(error.message, 'Wrong input param form mongo function');
				done();
			});
		});

		it("fail - no document", function(done) {
			mongo.save("myCollection", null, function(error) {
				assert.ok(error);
				assert.ok(error.message);
				//assert.equal(error.message, 'Wrong input param form mongo function');
				done();
			});
		});

		it('success - all working', function(done) {
			mongo.findOne('myCollection', {}, function(error, record) {
				assert.ifError(error);
				assert.ok(record);
				mongo.save("myCollection", record, function(error, response) {
					assert.ifError(error);
					assert.ok(response);
					done();
				});
			});
		});
	});

	describe("testing update", function() {
		it("fail - no collectionName", function(done) {
			mongo.update(null, function(error) {
				assert.ok(error);
				assert.ok(error.message);
				//assert.equal(error.message, 'Wrong input param form mongo function');
				done();
			});
		});

		it('success - all working', function(done) {
			mongo.update("myCollection", {'a': 'b'}, {$set: {'a': 'b'}}, function(error, response) {
				assert.ifError(error);
				assert.ok(response);
				done();
			});
		});
	});

	describe("testing find", function() {
		it("fail - no collectionName", function(done) {
			mongo.find(null, function(error) {
				assert.ok(error);
				assert.ok(error.message);
				//assert.equal(error.message, 'Wrong input param form mongo function');
				done();
			});
		});

		it('success - all working', function(done) {
			mongo.find("myCollection", function(error, response) {
				assert.ifError(error);
				assert.ok(response);
				done();
			});
		});

		it('success - all working', function(done) {
			mongo.find("myCollection", {}, function(error, response) {
				assert.ifError(error);
				assert.ok(response);
				done();
			});
		});

		it('success - all working', function(done) {
			mongo.find("myCollection", {}, {}, function(error, response) {
				assert.ifError(error);
				assert.ok(response);
				done();
			});
		});
	});

	describe("testing find and modify", function() {
		it("fail - no collectionName", function(done) {
			mongo.findAndModify(null, function(error) {
				assert.ok(error);
				assert.ok(error.message);
				//assert.equal(error.message, 'Wrong input param form mongo function');
				done();
			});
		});

		it('success - all working', function(done) {
			mongo.findAndModify("myCollection", {'a': 'b'}, {'a': 1}, {$set: {'a': 'c'}}, function(error, response) {
				assert.ifError(error);
				assert.ok(response);
				done();
			});
		});

	});

	describe("testing find and remove", function() {
		it("fail - no collectionName", function(done) {
			mongo.findAndRemove(null, function(error) {
				assert.ok(error);
				assert.ok(error.message);
				//assert.equal(error.message, 'Wrong input param form mongo function');
				done();
			});
		});

		it('success - all working', function(done) {
			mongo.findAndRemove("myCollection", {'a': 'b'}, {'a': 1}, function(error, response) {
				assert.ifError(error);
				done();
			});
		});
	});

	describe("testing find one", function() {
		it("fail - no collectionName", function(done) {
			mongo.findOne(null, function(error) {
				assert.ok(error);
				assert.ok(error.message);
				//assert.equal(error.message, 'Wrong input param form mongo function');
				done();
			});
		});

		it('success - all working', function(done) {
			mongo.findOne("myCollection", {'a': 'c'}, function(error, response) {
				assert.ifError(error);
				console.log(response);
				done();
			});
		});
	});

	describe("testing count", function() {
		it("fail - no collectionName", function(done) {
			mongo.count(null, null, function(error) {
				assert.ok(error);
				assert.ok(error.message);
				//assert.equal(error.message, 'Wrong input param form mongo function');
				done();
			});
		});

		it('success - all working', function(done) {
			mongo.count("myCollection", {'a': 'c'}, function(error, response) {
				assert.ifError(error);
				assert.equal(response, 1);
				done();
			});
		});

		it('success - all working', function(done) {
			mongo.count("myCollection", {'a': 'b'}, function(error, response) {
				assert.ifError(error);
				assert.equal(response, 0);
				done();
			});
		});
	});

	describe("testing remove", function() {
		it("fail - no collectionName", function(done) {
			mongo.remove(null, null, function(error) {
				assert.ok(error);
				assert.ok(error.message);
				//assert.equal(error.message, 'Wrong input param form mongo function');
				done();
			});
		});

		it('success - all working', function(done) {
			mongo.remove("myCollection", {'a': 'c'}, function(error, response) {
				assert.ifError(error);
				done();
			});
		});
	});

	describe("testing drop collection", function() {
		it("fail - no collectionName", function(done) {
			mongo.dropCollection(null, function(error) {
				assert.ok(error);
				assert.ok(error.message);
				//assert.equal(error.message, 'Wrong input param form mongo function');
				done();
			});
		});

		it('success - all working', function(done) {
			mongo.dropCollection("myCollection", function(error, response) {
				assert.ifError(error);
				done();
			});
		});
	});

});