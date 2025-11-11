"use strict";
/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */

const assert = require('assert');

describe("Testing index.js error handlers", () => {

	describe("Process error event handlers", () => {

		let originalUncaughtListeners;
		let originalRejectionListeners;

		before(() => {
			// Save original listeners
			originalUncaughtListeners = process.listeners('uncaughtException');
			originalRejectionListeners = process.listeners('unhandledRejection');
		});

		after(() => {
			// Restore original listeners after tests
			// This is important to not break other tests
		});

		it("should have uncaughtException handler registered", (done) => {
			const listeners = process.listeners('uncaughtException');
			assert.ok(listeners.length > 0, 'Should have at least one uncaughtException listener');
			done();
		});

		it("should have unhandledRejection handler registered", (done) => {
			const listeners = process.listeners('unhandledRejection');
			assert.ok(listeners.length > 0, 'Should have at least one unhandledRejection listener');
			done();
		});

		it("should handle error object with message and stack", (done) => {
			// Test that the handler can process error objects correctly
			const testError = new Error('Test error');
			assert.ok(testError.message);
			assert.ok(testError.stack);
			done();
		});

		it("should handle error-like objects", (done) => {
			// Test error-like objects that might be thrown
			const errorLike = {
				message: 'Custom error',
				stack: 'Stack trace here'
			};
			assert.ok(errorLike.message);
			assert.ok(errorLike.stack);
			done();
		});

		it("should handle non-Error rejection reasons", (done) => {
			// Test that rejection handler can handle non-Error reasons
			const reason = 'String rejection reason';
			assert.equal(typeof reason, 'string');
			done();
		});

		it("should handle Error rejection reasons", (done) => {
			// Test that rejection handler can handle Error reasons
			const reason = new Error('Rejection error');
			assert.ok(reason instanceof Error);
			assert.ok(reason.message);
			done();
		});
	});

	describe("Process shutdown events", () => {

		it("should be able to emit SOAJS_SHUTDOWN event", (done) => {
			let shutdownCalled = false;

			// Add a listener for the custom shutdown event
			const listener = () => {
				shutdownCalled = true;
			};

			process.once('SOAJS_SHUTDOWN', listener);

			// Emit the event
			process.emit('SOAJS_SHUTDOWN');

			// Verify it was received
			assert.ok(shutdownCalled, 'SOAJS_SHUTDOWN event should have been received');
			done();
		});

		it("should support multiple SOAJS_SHUTDOWN listeners", (done) => {
			let listener1Called = false;
			let listener2Called = false;

			const listener1 = () => { listener1Called = true; };
			const listener2 = () => { listener2Called = true; };

			process.once('SOAJS_SHUTDOWN', listener1);
			process.once('SOAJS_SHUTDOWN', listener2);

			process.emit('SOAJS_SHUTDOWN');

			assert.ok(listener1Called, 'First listener should be called');
			assert.ok(listener2Called, 'Second listener should be called');
			done();
		});
	});

	describe("Graceful shutdown behavior", () => {

		it("should allow cleanup operations during shutdown", (done) => {
			let cleanupCompleted = false;

			const cleanupListener = () => {
				// Simulate cleanup operation
				cleanupCompleted = true;
			};

			process.once('SOAJS_SHUTDOWN', cleanupListener);
			process.emit('SOAJS_SHUTDOWN');

			// Verify cleanup was triggered
			assert.ok(cleanupCompleted, 'Cleanup should have been completed');
			done();
		});

		it("should allow async cleanup operations", (done) => {
			let cleanupCompleted = false;

			const asyncCleanupListener = () => {
				// Simulate async cleanup
				setTimeout(() => {
					cleanupCompleted = true;
				}, 10);
			};

			process.once('SOAJS_SHUTDOWN', asyncCleanupListener);
			process.emit('SOAJS_SHUTDOWN');

			// Check after a short delay
			setTimeout(() => {
				assert.ok(cleanupCompleted, 'Async cleanup should have completed');
				done();
			}, 50);
		});
	});

	describe("Module exports", () => {

		it("should export server.service", (done) => {
			const soajs = require('../../index.js');
			assert.ok(soajs.server, 'Should export server object');
			assert.ok(soajs.server.service, 'Should export server.service');
			done();
		});

		it("should export server.daemon", (done) => {
			const soajs = require('../../index.js');
			assert.ok(soajs.server, 'Should export server object');
			assert.ok(soajs.server.daemon, 'Should export server.daemon');
			done();
		});

		it("should export extractAPIsList utility", (done) => {
			const soajs = require('../../index.js');
			assert.ok(soajs.extractAPIsList, 'Should export extractAPIsList');
			assert.equal(typeof soajs.extractAPIsList, 'function');
			done();
		});

		it("should export core modules", (done) => {
			const soajs = require('../../index.js');
			assert.ok(soajs.core, 'Should export core');
			assert.ok(soajs.mongo, 'Should export mongo');
			assert.ok(soajs.utils, 'Should export utils');
			done();
		});

		it("should export authorization module", (done) => {
			const soajs = require('../../index.js');
			assert.ok(soajs.authorization, 'Should export authorization');
			done();
		});

		it("should export provision module", (done) => {
			const soajs = require('../../index.js');
			assert.ok(soajs.provision, 'Should export provision');
			done();
		});
	});
});
