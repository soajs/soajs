"use strict";

var assert = require('assert');
var helper = require("../helper.js");
var coreSecurity = helper.requireModule('./modules/soajs.core/security/index').authorization;

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
			output = coreSecurity.mask(inputSize32);
			assert.ok(output);
			assert.equal(output.length, 35);
			done();
		});

		it('should mask data C01', function(done) {
			output = coreSecurity.mask(inputSize32, 'C01');
			assert.ok(output);
			assert.equal(output.length, 35);
			done();
		});

		it('should mask data C02', function(done) {
			output = coreSecurity.mask(inputSize32, 'C02');
			assert.ok(output);
			assert.equal(output.length, 35);
			done();
		});

		it('should mask data C03', function(done) {
			output = coreSecurity.mask(inputSize32, 'C03');
			assert.ok(output);
			assert.equal(output.length, 35);
			done();
		});
	});

	describe("umask tests", function() {
		it('should unmask', function(done) {
			var o = replaceAt(output, 0, 'a');
			var t = coreSecurity.umask(o);
			assert.ok(t);
			assert.equal(t.length, 32);
			assert.equal(t, output.slice(3));
			done();
		});

		it('should unmask data C01', function(done) {
			var t = coreSecurity.umask("C01abclefgpijkdmnohqrstuvwxyz123456");
			assert.ok(t);
			assert.equal(t.length, 32);
			assert.equal(t, inputSize32);
			done();
		});

		it('should unmask data C02', function(done) {
			var t = coreSecurity.umask("C02abcdmfghipklenojqrstuvwxyz123456");
			assert.ok(t);
			assert.equal(t.length, 32);
			assert.equal(t, inputSize32);
			done();
		});

		it('should unmask data C03', function(done) {
			var t = coreSecurity.umask("C03abcdenghijkpmfolqrstuvwxyz123456");
			assert.ok(t);
			assert.equal(t.length, 32);
			assert.equal(t, inputSize32);
			done();
		});
	});

	describe("set tests", function() {
		it("should set", function(done) {
			coreSecurity.set(x, inputSize32);
			assert.ok(x.cookie);
			assert.equal(x.cookie.length, 74);
			done();
		});
	});

	describe("get tests", function() {
		it('should get', function(done) {
			var s = coreSecurity.get(x.cookie);
			assert.ok(s);
			assert.equal(s.length, 35);
			s = coreSecurity.umask(s);
			assert.ok(s);
			assert.equal(s.length, 32);
			assert.equal(s, inputSize32);
			done();
		});

		it('should return null', function(done) {
			var s = coreSecurity.get("wrong value");
			assert.equal(s, null);
			done();
		});
	});

	describe("setCookies tests", function() {

		it('null - no authorization', function(done) {
			var s = coreSecurity.setCookie("wrong value", 'some secret', 'myCookie');
			assert.equal(s, null);
			done();
		});

		it('null - no securityId', function(done) {
			var s = coreSecurity.setCookie("soajsauth___Basic c29hanM6czAzYWJjZGVuZ2hpamtwbWZvbHFyc3R1dnd4eXoxMjM0NTY=", 'some secret', 'myCookie');
			assert.ok(s);
			assert.ok(s.indexOf('myCookie=') !== -1);
			done();
		});

		it('fail - secret required', function(done) {
			try {
				var s = coreSecurity.setCookie("soajsauth___Basic c29hanM6czAzYWJjZGVuZ2hpamtwbWZvbHFyc3R1dnd4eXoxMjM0NTY=", null, 'myCookie');
			}
			catch(e) {
				assert.ok(e);
				assert.equal(e.message, 'secret required');
			}
			done();
		});
	});

});
