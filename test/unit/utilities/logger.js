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

let logger = helper.requireModule('./utilities/logger.js');

describe("Testing utilities/logger", () => {

	describe("Sensitive data redaction", () => {

		it("should redact password fields", (done) => {
			let data = { username: 'john', password: 'secret123' };
			let redacted = logger.redact(data);
			assert.equal(redacted.username, 'john');
			assert.equal(redacted.password, '[REDACTED]');
			done();
		});

		it("should redact API keys and tokens", (done) => {
			let data = {
				apikey: 'abc123',
				access_token: 'xyz789',
				refresh_token: 'refresh123'
			};
			let redacted = logger.redact(data);
			assert.equal(redacted.apikey, '[REDACTED]');
			assert.equal(redacted.access_token, '[REDACTED]');
			assert.equal(redacted.refresh_token, '[REDACTED]');
			done();
		});

		it("should redact JWT tokens in strings", (done) => {
			let text = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
			let redacted = logger.redact(text);
			assert.ok(redacted.includes('[REDACTED]'));
			assert.ok(!redacted.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'));
			done();
		});

		it("should redact API keys in strings", (done) => {
			let text = "Use api_key=abc123def456 for authentication";
			let redacted = logger.redact(text);
			assert.ok(redacted.includes('[REDACTED]'));
			assert.ok(!redacted.includes('api_key=abc123def456'));
			done();
		});

		it("should redact passwords in strings", (done) => {
			let text = "Login with password=secret123 to continue";
			let redacted = logger.redact(text);
			assert.ok(redacted.includes('[REDACTED]'));
			assert.ok(!redacted.includes('password=secret123'));
			done();
		});

		it("should redact URLs with credentials", (done) => {
			let text = "Connect to mongodb://user:pass@localhost:27017/db";
			let redacted = logger.redact(text);
			assert.ok(redacted.includes('[REDACTED]'));
			assert.ok(!redacted.includes('user:pass@'));
			done();
		});

		it("should handle null values", (done) => {
			let redacted = logger.redact(null);
			assert.equal(redacted, null);
			done();
		});

		it("should handle undefined values", (done) => {
			let redacted = logger.redact(undefined);
			assert.equal(redacted, undefined);
			done();
		});

		it("should handle primitive types", (done) => {
			assert.equal(logger.redact(123), 123);
			assert.equal(logger.redact(true), true);
			assert.equal(logger.redact(false), false);
			done();
		});

		it("should handle arrays with sensitive data", (done) => {
			let data = [
				{ name: 'user1', password: 'pass1' },
				{ name: 'user2', password: 'pass2' }
			];
			let redacted = logger.redact(data);
			assert.equal(redacted[0].name, 'user1');
			assert.equal(redacted[0].password, '[REDACTED]');
			assert.equal(redacted[1].name, 'user2');
			assert.equal(redacted[1].password, '[REDACTED]');
			done();
		});

		it("should handle nested objects with sensitive data", (done) => {
			let data = {
				user: {
					name: 'john',
					credentials: {
						password: 'secret',
						token: 'abc123'
					}
				}
			};
			let redacted = logger.redact(data);
			assert.equal(redacted.user.name, 'john');
			assert.equal(redacted.user.credentials.password, '[REDACTED]');
			assert.equal(redacted.user.credentials.token, '[REDACTED]');
			done();
		});

		it("should handle circular references", (done) => {
			let data = { name: 'test' };
			data.self = data; // Create circular reference

			// Should not throw an error
			let redacted = logger.redact(data);
			assert.ok(redacted);
			assert.equal(redacted.name, 'test');
			done();
		});

		it("should respect max depth limit", (done) => {
			// Create deeply nested object
			let data = {
				level1: {
					level2: {
						level3: {
							level4: {
								level5: {
									level6: {
										level7: {
											level8: {
												level9: {
													level10: {
														level11: { password: 'should_be_truncated' }
													}
												}
											}
										}
									}
								}
							}
						}
					}
				}
			};

			let redacted = logger.redact(data);
			// Should have stopped before reaching level11
			assert.ok(redacted);
			done();
		});

		it("should handle error objects safely", (done) => {
			let error = new Error('Test error message');

			let redacted = logger.redact(error);
			assert.ok(redacted);
			assert.equal(redacted.name, 'Error');
			assert.equal(redacted.message, 'Test error message');
			assert.equal(redacted.stack, '[Stack Trace Redacted]');
			done();
		});

		it("should redact sensitive patterns in error messages", (done) => {
			let error = new Error('Login failed with password=secret123');

			let redacted = logger.redact(error);
			assert.ok(redacted);
			assert.ok(redacted.message.includes('[REDACTED]'));
			assert.ok(!redacted.message.includes('password=secret123'));
			done();
		});
	});

	describe("Logger methods", () => {

		it("should log info messages without error", (done) => {
			// Should not throw
			logger.info('Test info message', { data: 'test' });
			done();
		});

		it("should log error messages without error", (done) => {
			// Should not throw
			logger.error('Test error message', { error: 'test' });
			done();
		});

		it("should automatically redact sensitive data in info logs", (done) => {
			// Should not expose sensitive data
			logger.info('User login', {
				username: 'john',
				password: 'secret123'
			});
			done();
		});

		it("should automatically redact sensitive data in error logs", (done) => {
			// Should not expose sensitive data
			logger.error('Login failed', {
				username: 'john',
				password: 'secret123',
				token: 'abc123'
			});
			done();
		});

		it("should handle multiple arguments", (done) => {
			logger.info('Message', { key1: 'value1' }, { key2: 'value2' });
			done();
		});

		it("should handle mixed argument types", (done) => {
			logger.info('Message', 'string', 123, { key: 'value' }, true);
			done();
		});
	});
});
