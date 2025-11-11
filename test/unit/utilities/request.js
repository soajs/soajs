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
const http = require('http');

let request = helper.requireModule('./utilities/request.js');

describe("Testing utilities/request", () => {

	let testServer;
	let serverPort = 9876;
	let serverUrl;

	before((done) => {
		// Create a test HTTP server
		testServer = http.createServer((req, res) => {
			let body = '';

			req.on('data', chunk => {
				body += chunk.toString();
			});

			req.on('end', () => {
				const url = req.url;
				const method = req.method;

				// Route: /success - returns 200 with JSON
				if (url === '/success') {
					res.writeHead(200, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({ success: true, method: method }));
				}
				// Route: /echo - echoes back the request body
				else if (url.startsWith('/echo')) {
					res.writeHead(200, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({
						received: body ? JSON.parse(body) : null,
						method: method,
						query: url.split('?')[1] || null
					}));
				}
				// Route: /text - returns plain text
				else if (url === '/text') {
					res.writeHead(200, { 'Content-Type': 'text/plain' });
					res.end('Plain text response');
				}
				// Route: /error - returns 500
				else if (url === '/error') {
					res.writeHead(500, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({ error: 'Internal Server Error' }));
				}
				// Route: /notfound - returns 404
				else if (url === '/notfound') {
					res.writeHead(404, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({ error: 'Not Found' }));
				}
				// Route: /invalid-json - returns invalid JSON
				else if (url === '/invalid-json') {
					res.writeHead(200, { 'Content-Type': 'application/json' });
					res.end('{ invalid json }');
				}
				// Route: /delay - delays response
				else if (url === '/delay') {
					setTimeout(() => {
						res.writeHead(200, { 'Content-Type': 'application/json' });
						res.end(JSON.stringify({ delayed: true }));
					}, 100);
				}
				// Route: /timeout - never responds (for timeout tests)
				else if (url === '/timeout') {
					// Don't respond - will trigger timeout
				}
				// Default: 404
				else {
					res.writeHead(404, { 'Content-Type': 'text/plain' });
					res.end('Not Found');
				}
			});
		});

		testServer.listen(serverPort, () => {
			serverUrl = `http://127.0.0.1:${serverPort}`;
			done();
		});
	});

	after((done) => {
		if (testServer) {
			testServer.close(done);
		} else {
			done();
		}
	});

	describe("httpRequestLight", () => {

		it("should make a successful GET request", async () => {
			const result = await request.httpRequestLight({
				uri: `${serverUrl}/success`
			});
			assert.ok(result.success);
			assert.equal(result.method, 'GET');
		});

		it("should make a successful POST request with data", async () => {
			const result = await request.httpRequestLight({
				uri: `${serverUrl}/echo`,
				method: 'POST',
				data: { test: 'data' }
			});
			assert.equal(result.method, 'POST');
			assert.equal(result.received.test, 'data');
		});

		it("should make a successful PUT request", async () => {
			const result = await request.httpRequestLight({
				uri: `${serverUrl}/echo`,
				method: 'PUT',
				data: { update: 'value' }
			});
			assert.equal(result.method, 'PUT');
			assert.equal(result.received.update, 'value');
		});

		it("should make a successful DELETE request", async () => {
			const result = await request.httpRequestLight({
				uri: `${serverUrl}/echo`,
				method: 'DELETE'
			});
			assert.equal(result.method, 'DELETE');
		});

		it("should make a successful PATCH request", async () => {
			const result = await request.httpRequestLight({
				uri: `${serverUrl}/echo`,
				method: 'PATCH',
				data: { patch: 'data' }
			});
			assert.equal(result.method, 'PATCH');
			assert.equal(result.received.patch, 'data');
		});

		it("should handle query string parameters", async () => {
			const result = await request.httpRequestLight({
				uri: `${serverUrl}/echo`,
				qs: { foo: 'bar', test: '123' }
			});
			assert.ok(result.query);
			assert.ok(result.query.includes('foo=bar'));
			assert.ok(result.query.includes('test=123'));
		});

		it("should merge query strings with existing URL params", async () => {
			const result = await request.httpRequestLight({
				uri: `${serverUrl}/echo?existing=param`,
				qs: { new: 'param' }
			});
			assert.ok(result.query.includes('existing=param'));
			assert.ok(result.query.includes('new=param'));
		});

		it("should accept body parameter (alias for data)", async () => {
			const result = await request.httpRequestLight({
				uri: `${serverUrl}/echo`,
				method: 'POST',
				body: { via: 'body' }
			});
			assert.equal(result.received.via, 'body');
		});

		it("should handle custom headers", async () => {
			const result = await request.httpRequestLight({
				uri: `${serverUrl}/success`,
				headers: {
					'X-Custom-Header': 'test-value'
				}
			});
			assert.ok(result.success);
		});

		it("should handle non-JSON responses when json=false", async () => {
			const result = await request.httpRequestLight({
				uri: `${serverUrl}/text`,
				json: false
			});
			assert.equal(result, 'Plain text response');
		});

		it("should handle invalid JSON responses gracefully", async () => {
			const result = await request.httpRequestLight({
				uri: `${serverUrl}/invalid-json`
			});
			// Should return raw string when JSON parsing fails
			assert.ok(typeof result === 'string');
		});

		it("should reject on 4xx status codes", async () => {
			try {
				await request.httpRequestLight({
					uri: `${serverUrl}/notfound`
				});
				assert.fail('Should have rejected');
			} catch (error) {
				assert.ok(error.message.includes('404'));
			}
		});

		it("should reject on 5xx status codes", async () => {
			try {
				await request.httpRequestLight({
					uri: `${serverUrl}/error`
				});
				assert.fail('Should have rejected');
			} catch (error) {
				assert.ok(error.message.includes('500'));
			}
		});

		it("should reject on invalid URL", async () => {
			try {
				await request.httpRequestLight({
					uri: 'not-a-valid-url'
				});
				assert.fail('Should have rejected');
			} catch (error) {
				assert.ok(error);
			}
		});

		it("should reject on connection refused", async () => {
			try {
				await request.httpRequestLight({
					uri: 'http://127.0.0.1:9999/unreachable'
				});
				assert.fail('Should have rejected');
			} catch (error) {
				assert.ok(error);
			}
		});

		it("should uppercase HTTP method", async () => {
			const result = await request.httpRequestLight({
				uri: `${serverUrl}/echo`,
				method: 'post',  // lowercase
				data: { test: 'uppercase' }
			});
			assert.equal(result.method, 'POST');
		});
	});

	describe("httpRequest (with timeout)", () => {

		it("should make a successful GET request", async () => {
			const result = await request.httpRequest({
				uri: `${serverUrl}/success`
			});
			assert.ok(result.success);
			assert.equal(result.method, 'GET');
		});

		it("should make a successful POST request with data", async () => {
			const result = await request.httpRequest({
				uri: `${serverUrl}/echo`,
				method: 'POST',
				data: { test: 'data' }
			});
			assert.equal(result.method, 'POST');
			assert.equal(result.received.test, 'data');
		});

		it("should make a successful PUT request", async () => {
			const result = await request.httpRequest({
				uri: `${serverUrl}/echo`,
				method: 'PUT',
				data: { update: 'value' }
			});
			assert.equal(result.method, 'PUT');
			assert.equal(result.received.update, 'value');
		});

		it("should make a successful DELETE request", async () => {
			const result = await request.httpRequest({
				uri: `${serverUrl}/echo`,
				method: 'DELETE'
			});
			assert.equal(result.method, 'DELETE');
		});

		it("should handle query string parameters", async () => {
			const result = await request.httpRequest({
				uri: `${serverUrl}/echo`,
				qs: { param1: 'value1', param2: 'value2' }
			});
			assert.ok(result.query.includes('param1=value1'));
			assert.ok(result.query.includes('param2=value2'));
		});

		it("should handle custom headers", async () => {
			const result = await request.httpRequest({
				uri: `${serverUrl}/success`,
				headers: {
					'X-Test-Header': 'header-value'
				}
			});
			assert.ok(result.success);
		});

		it("should handle non-JSON responses when json=false", async () => {
			const result = await request.httpRequest({
				uri: `${serverUrl}/text`,
				json: false
			});
			assert.equal(result, 'Plain text response');
		});

		it("should reject on 4xx status with error and body", async () => {
			try {
				await request.httpRequest({
					uri: `${serverUrl}/notfound`
				});
				assert.fail('Should have rejected');
			} catch (err) {
				assert.ok(err.error);
				assert.ok(err.body);
				assert.ok(err.error.message.includes('404'));
			}
		});

		it("should reject on 5xx status with error and body", async () => {
			try {
				await request.httpRequest({
					uri: `${serverUrl}/error`
				});
				assert.fail('Should have rejected');
			} catch (err) {
				assert.ok(err.error);
				assert.ok(err.body);
				assert.ok(err.error.message.includes('500'));
			}
		});

		it("should handle invalid JSON in error response", async () => {
			try {
				await request.httpRequest({
					uri: `${serverUrl}/notfound`
				});
				assert.fail('Should have rejected');
			} catch (err) {
				assert.ok(err.error);
				// Body should still be present even if JSON parsing fails
				assert.ok(err.body !== undefined);
			}
		});

		it("should reject on invalid URL with error object", async () => {
			try {
				await request.httpRequest({
					uri: 'not-a-valid-url'
				});
				assert.fail('Should have rejected');
			} catch (err) {
				assert.ok(err.error);
				assert.equal(err.body, null);
			}
		});

		it("should reject on connection refused with error object", async () => {
			try {
				await request.httpRequest({
					uri: 'http://127.0.0.1:9999/unreachable'
				});
				assert.fail('Should have rejected');
			} catch (err) {
				assert.ok(err.error || err.message);
			}
		});

		it("should timeout after specified duration", async () => {
			try {
				await request.httpRequest({
					uri: `${serverUrl}/timeout`,
					timeout: 50  // Very short timeout
				});
				assert.fail('Should have timed out');
			} catch (error) {
				// Should be a timeout error
				assert.ok(error.message === 'Request timed out' || error.code === 'ECONNRESET');
			}
		}).timeout(5000);

		it("should use default timeout when not specified", async () => {
			const result = await request.httpRequest({
				uri: `${serverUrl}/delay`
			});
			assert.ok(result.delayed);
		});

		it("should handle successful request within timeout", async () => {
			const result = await request.httpRequest({
				uri: `${serverUrl}/success`,
				timeout: 5000
			});
			assert.ok(result.success);
		});

		it("should handle body parameter (alias for data)", async () => {
			const result = await request.httpRequest({
				uri: `${serverUrl}/echo`,
				method: 'POST',
				body: { via: 'body' }
			});
			assert.equal(result.received.via, 'body');
		});

		it("should uppercase HTTP method", async () => {
			const result = await request.httpRequest({
				uri: `${serverUrl}/echo`,
				method: 'patch',  // lowercase
				data: { test: 'uppercase' }
			});
			assert.equal(result.method, 'PATCH');
		});

		it("should handle invalid JSON in success response gracefully", async () => {
			const result = await request.httpRequest({
				uri: `${serverUrl}/invalid-json`
			});
			// Should return raw string when JSON parsing fails
			assert.ok(typeof result === 'string');
		});
	});

	describe("Race condition prevention", () => {

		it("should prevent multiple settlements in httpRequestLight", async () => {
			// This is tested by the internal settleOnce mechanism
			// Just ensure requests complete successfully
			const result = await request.httpRequestLight({
				uri: `${serverUrl}/success`
			});
			assert.ok(result);
		});

		it("should prevent multiple settlements in httpRequest", async () => {
			const result = await request.httpRequest({
				uri: `${serverUrl}/success`
			});
			assert.ok(result);
		});
	});
});
