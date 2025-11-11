'use strict';

require("./classes/http");
const coreModules = require("soajs.core.modules");
const coreLibs = require("soajs.core.libs");
const logger = require("./utilities/logger");

//NOTE: backward compatibility for multitenant
const registryModule = require("./modules/registry");
coreModules.core.registry = registryModule;

// Track if we're already shutting down
let isShuttingDown = false;

process.on('uncaughtException', (e) => {
	logger.error('FATAL: Uncaught Exception', {
		error: e.message,
		stack: e.stack
	});

	// Prevent multiple shutdown attempts
	if (isShuttingDown) {
		logger.error('Already shutting down, forcing exit');
		process.exit(1);
		return;
	}

	isShuttingDown = true;

	// Give the process some time to gracefully shutdown
	logger.error('Attempting graceful shutdown...');

	// Emit a custom event that servers can listen to for cleanup
	process.emit('SOAJS_SHUTDOWN');

	// Force exit after timeout if graceful shutdown doesn't complete
	setTimeout(() => {
		logger.error('Graceful shutdown timeout exceeded, forcing exit');
		process.exit(1);
	}, 5000); // 5 second timeout for cleanup

	// Note: If all cleanup completes, call process.exit(1) in the cleanup handlers
});

// Also handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
	logger.error('FATAL: Unhandled Promise Rejection', {
		reason: reason instanceof Error ? reason.message : reason
	});

	// Treat unhandled rejections as uncaught exceptions
	process.emit('uncaughtException', reason);
});

/**
 *
 * @type {{mw: {soajs: exports, response: exports, rm: exports, inputmask: exports}, restServer: (service|exports), rmServer: (controller|exports)}}
 */
module.exports = {
	"server": {
		"service": require("./servers/service.js"),
		"daemon": require("./servers/daemon.js")
	},
	"extractAPIsList": require("./utilities/utils.js").extractAPIsList,
	"es": coreModules.es,
	"mail": coreModules.mail,
	"mongo": coreModules.mongo,
	"hasher": coreModules.hasher,
	"core": coreModules.core,
	"authorization": coreModules.authorization,
	"provision": coreModules.provision,
	"utils": coreLibs.utils
};

