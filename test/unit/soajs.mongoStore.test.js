"use strict";
var assert = require('assert');
var session = require('express-session');

var helper = require("../helper.js");
var core = helper.requireModule("./modules/soajs.core/index");
var soajsmongoStore = helper.requireModule('./modules/soajs.mongoStore');

describe("mongoStore tests", function() {
	var MongoStore = soajsmongoStore(session);
	var registry = core.getRegistry();
	var store = new MongoStore(registry.coreDB.session);

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