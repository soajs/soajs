"use strict";

var assert = require('assert');
var helper = require("../helper.js");
var coreSecurity = helper.requireModule('./modules/soajs.core').security;
var authSecurity = coreSecurity.authorization;
var hashSecurity = coreSecurity.hasher;

function replaceAt(string, index, character) {
	return string.substr(0, index) + character + string.substr(index + character.length);
}

describe("core security tests", function() {
	var inputSize32 = "abcdefghijklmnopqrstuvwxyz123456";
	var output, x;

	before(function(done) {
		var Driver = function() { this.cookie = null; };
		Driver.prototype.set = function(name, value) {
			this.cookie = name + "___" + value;
		};
		x = new Driver();
		done();
	});

	describe("mask tests", function() {
		it('should mask data', function(done) {
			output = authSecurity.mask(inputSize32);
			assert.ok(output);
			assert.equal(output.length, 35);
			done();
		});

		it('should mask data C01', function(done) {
			output = authSecurity.mask(inputSize32, 'C01');
			assert.ok(output);
			assert.equal(output.length, 35);
			done();
		});

		it('should mask data C02', function(done) {
			output = authSecurity.mask(inputSize32, 'C02');
			assert.ok(output);
			assert.equal(output.length, 35);
			done();
		});

		it('should mask data C03', function(done) {
			output = authSecurity.mask(inputSize32, 'C03');
			assert.ok(output);
			assert.equal(output.length, 35);
			done();
		});
	});

	describe("umask tests", function() {
		it('should unmask', function(done) {
			var o = replaceAt(output, 0, 'a');
			var t = authSecurity.umask(o);
			assert.ok(t);
			assert.equal(t.length, 32);
			assert.equal(t, output.slice(3));
			done();
		});

		it('should unmask data C01', function(done) {
			var t = authSecurity.umask("C01abclefgpijkdmnohqrstuvwxyz123456");
			assert.ok(t);
			assert.equal(t.length, 32);
			assert.equal(t, inputSize32);
			done();
		});

		it('should unmask data C02', function(done) {
			var t = authSecurity.umask("C02abcdmfghipklenojqrstuvwxyz123456");
			assert.ok(t);
			assert.equal(t.length, 32);
			assert.equal(t, inputSize32);
			done();
		});

		it('should unmask data C03', function(done) {
			var t = authSecurity.umask("C03abcdenghijkpmfolqrstuvwxyz123456");
			assert.ok(t);
			assert.equal(t.length, 32);
			assert.equal(t, inputSize32);
			done();
		});
	});

	describe("set tests", function() {
		it("should set", function(done) {
			authSecurity.set(x, inputSize32);
			assert.ok(x.cookie);
			assert.equal(x.cookie.length, 74);
			done();
		});
	});

	describe("get tests", function() {
		it('should get', function(done) {
			var s = authSecurity.get(x.cookie);
			assert.ok(s);
			assert.equal(s.length, 35);
			s = authSecurity.umask(s);
			assert.ok(s);
			assert.equal(s.length, 32);
			assert.equal(s, inputSize32);
			done();
		});

		it('should return null', function(done) {
			var s = authSecurity.get("wrong value");
			assert.equal(s, null);
			done();
		});
	});

	describe("setCookies tests", function() {

		it('null - no authorization', function(done) {
			var s = authSecurity.setCookie("wrong value", 'some secret', 'myCookie');
			assert.equal(s, null);
			done();
		});

		it('null - no securityId', function(done) {
			var s = authSecurity.setCookie("soajsauth___Basic c29hanM6czAzYWJjZGVuZ2hpamtwbWZvbHFyc3R1dnd4eXoxMjM0NTY=", 'some secret', 'myCookie');
			assert.ok(s);
			assert.ok(s.indexOf('myCookie=') !== -1);
			done();
		});

		it('fail - secret required', function(done) {
			try {
				var s = authSecurity.setCookie("soajsauth___Basic c29hanM6czAzYWJjZGVuZ2hpamtwbWZvbHFyc3R1dnd4eXoxMjM0NTY=", null, 'myCookie');
			}
			catch(e) {
				assert.ok(e);
				assert.equal(e.message, 'secret required');
			}
			done();
		});
	});

	describe("generate authorization tests", function(){

		it("will generate authorization", function(done){
			var id = "10d2cb5fc04ce51e06000001";
			var secret = "i am a secret";
			var authorization = authSecurity.generate(id, secret);
			assert.ok(authorization);
			assert.ok(authorization !== "");
			assert.ok(authorization.indexOf("Basic ") !== -1);
			assert.equal("Basic " + new Buffer(id.toString() + ":" + secret.toString()).toString('base64'), authorization);
			done();
		});

	});

	describe("hasher tests", function() {
		var plain = "i am a plain sentence";
		var cypher1, cypher2;

		before(function(done){
			hashSecurity.init({
				"hashIterations": 1024,
				"seedLength": 32
			});
			done();
		});

		it('hash - sync', function(done) {
			cypher1 = hashSecurity.hash(plain);
			done();
		});

		it('hash async', function(done) {
			hashSecurity.hash(plain, true, function(error, response){
				assert.ifError(error);
				assert.ok(response);
				cypher2 = response;
				done();
			});
		});

		it('compare', function(done) {
			assert.ok(cypher1 !== cypher2);
			hashSecurity.compare(plain, cypher1, function(error, check){
				assert.ifError(error);
				assert.ok(check);
				assert.equal(check, true);
				done();
			});
		});
	});
});
