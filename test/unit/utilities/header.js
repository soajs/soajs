"use strict";
/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */

const helper = require("../../helper.js");
const assert = require('assert');

let header = helper.requireModule('./utilities/header.js');

describe("Testing utilities/header", () => {

	describe("encodeHeaderValue", () => {

		it("should encode a normal string", (done) => {
			let result = header.encodeHeaderValue("hello world");
			assert.equal(result, "hello%20world");
			done();
		});

		it("should encode special characters", (done) => {
			let result = header.encodeHeaderValue("user@example.com");
			assert.equal(result, "user%40example.com");
			done();
		});

		it("should handle null values", (done) => {
			let result = header.encodeHeaderValue(null);
			assert.equal(result, "");
			done();
		});

		it("should handle undefined values", (done) => {
			let result = header.encodeHeaderValue(undefined);
			assert.equal(result, "");
			done();
		});

		it("should encode numbers", (done) => {
			let result = header.encodeHeaderValue(12345);
			assert.equal(result, "12345");
			done();
		});

		it("should encode booleans", (done) => {
			let result = header.encodeHeaderValue(true);
			assert.equal(result, "true");
			done();
		});

		it("should encode complex strings with multiple special characters", (done) => {
			let result = header.encodeHeaderValue("key=value&foo=bar");
			assert.equal(result, "key%3Dvalue%26foo%3Dbar");
			done();
		});
	});

	describe("decodeHeaderValue", () => {

		it("should decode a URL-encoded string", (done) => {
			let result = header.decodeHeaderValue("hello%20world");
			assert.equal(result, "hello world");
			done();
		});

		it("should decode special characters", (done) => {
			let result = header.decodeHeaderValue("user%40example.com");
			assert.equal(result, "user@example.com");
			done();
		});

		it("should handle empty string", (done) => {
			let result = header.decodeHeaderValue("");
			assert.equal(result, "");
			done();
		});

		it("should handle null values", (done) => {
			let result = header.decodeHeaderValue(null);
			assert.equal(result, null);
			done();
		});

		it("should handle undefined values", (done) => {
			let result = header.decodeHeaderValue(undefined);
			assert.equal(result, undefined);
			done();
		});

		it("should handle malformed URI sequences gracefully", (done) => {
			// A lone '%' is malformed
			let result = header.decodeHeaderValue("invalid%");
			// Should return the original value since decoding fails
			assert.equal(result, "invalid%");
			done();
		});

		it("should handle malformed URI with incomplete escape", (done) => {
			let result = header.decodeHeaderValue("test%2");
			// Should return the original value
			assert.equal(result, "test%2");
			done();
		});

		it("should decode complex encoded strings", (done) => {
			let result = header.decodeHeaderValue("key%3Dvalue%26foo%3Dbar");
			assert.equal(result, "key=value&foo=bar");
			done();
		});

		it("should handle already decoded strings", (done) => {
			let result = header.decodeHeaderValue("plain text");
			assert.equal(result, "plain text");
			done();
		});
	});

	describe("round-trip encoding and decoding", () => {

		it("should preserve data through encode-decode cycle", (done) => {
			let original = "Test String: with special chars @ # $ % & *";
			let encoded = header.encodeHeaderValue(original);
			let decoded = header.decodeHeaderValue(encoded);
			assert.equal(decoded, original);
			done();
		});

		it("should preserve Unicode characters", (done) => {
			let original = "Hello 世界 🌍";
			let encoded = header.encodeHeaderValue(original);
			let decoded = header.decodeHeaderValue(encoded);
			assert.equal(decoded, original);
			done();
		});
	});
});
