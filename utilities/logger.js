'use strict';

/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */

/**
 * Secure logger that redacts sensitive data before logging
 * Prevents credential leakage, PII exposure in logs
 */

// List of sensitive field names to redact (case-insensitive)
const SENSITIVE_FIELDS = [
	'password',
	'passwd',
	'pass',
	'pwd',
	'secret',
	'token',
	'accesstoken',
	'access_token',
	'refreshtoken',
	'refresh_token',
	'apikey',
	'api_key',
	'key',
	'authorization',
	'auth',
	'cookie',
	'session',
	'sessionid',
	'session_id',
	'credit_card',
	'creditcard',
	'cvv',
	'ssn',
	'social_security'
];

// Patterns to match in string values (URLs with credentials, etc.)
const SENSITIVE_PATTERNS = [
	/Bearer\s+[\w-]+\.[\w-]+\.[\w-]+/gi,  // JWT tokens
	/api[_-]?key[=:]\s*[\w-]+/gi,          // API keys
	/token[=:]\s*[\w-]+/gi,                 // Generic tokens
	/password[=:]\s*\S+/gi,                 // Passwords in strings
	/\/\/[^:]+:[^@]+@/g                     // URLs with credentials
];

/**
 * Check if a field name is sensitive
 * @param {string} fieldName
 * @returns {boolean}
 */
function isSensitiveField(fieldName) {
	if (typeof fieldName !== 'string') {
		return false;
	}
	const lowerField = fieldName.toLowerCase();
	return SENSITIVE_FIELDS.some(sensitive => lowerField.includes(sensitive));
}

/**
 * Redact sensitive patterns from strings
 * @param {string} str
 * @returns {string}
 */
function redactSensitivePatterns(str) {
	if (typeof str !== 'string') {
		return str;
	}

	let redacted = str;
	SENSITIVE_PATTERNS.forEach(pattern => {
		redacted = redacted.replace(pattern, '[REDACTED]');
	});

	return redacted;
}

/**
 * Deep clone and redact sensitive data from objects
 * @param {*} obj - Object to redact
 * @param {number} depth - Current recursion depth
 * @param {number} maxDepth - Maximum recursion depth
 * @returns {*} Redacted copy
 */
function redactSensitiveData(obj, depth = 0, maxDepth = 10) {
	// Prevent infinite recursion
	if (depth > maxDepth) {
		return '[Max Depth Reached]';
	}

	// Handle null/undefined
	if (obj === null || obj === undefined) {
		return obj;
	}

	// Handle primitives
	if (typeof obj !== 'object') {
		if (typeof obj === 'string') {
			return redactSensitivePatterns(obj);
		}
		return obj;
	}

	// Handle Arrays
	if (Array.isArray(obj)) {
		return obj.map(item => redactSensitiveData(item, depth + 1, maxDepth));
	}

	// Handle Errors
	if (obj instanceof Error) {
		return {
			name: obj.name,
			message: redactSensitivePatterns(obj.message),
			stack: obj.stack ? '[Stack Trace Redacted]' : undefined
		};
	}

	// Handle Objects
	const redacted = {};
	for (const key in obj) {
		if (Object.hasOwnProperty.call(obj, key)) {
			if (isSensitiveField(key)) {
				redacted[key] = '[REDACTED]';
			} else {
				redacted[key] = redactSensitiveData(obj[key], depth + 1, maxDepth);
			}
		}
	}

	return redacted;
}

/**
 * Format log message with timestamp and level
 * @param {string} level
 * @param {Array} args
 * @returns {Array}
 */
function formatLogMessage(level, args) {
	const timestamp = new Date().toISOString();
	const formattedArgs = args.map(arg => {
		if (typeof arg === 'object' && arg !== null) {
			return redactSensitiveData(arg);
		}
		if (typeof arg === 'string') {
			return redactSensitivePatterns(arg);
		}
		return arg;
	});

	return [timestamp, `[${level.toUpperCase()}]`, ...formattedArgs];
}

/**
 * Secure logger object
 */
const logger = {
	/**
	 * Log info level message
	 */
	info: function(...args) {
		console.log(...formatLogMessage('info', args));
	},

	/**
	 * Log warning level message
	 */
	warn: function(...args) {
		console.warn(...formatLogMessage('warn', args));
	},

	/**
	 * Log error level message
	 */
	error: function(...args) {
		console.error(...formatLogMessage('error', args));
	},

	/**
	 * Log debug level message
	 */
	debug: function(...args) {
		if (process.env.NODE_ENV !== 'production') {
			console.log(...formatLogMessage('debug', args));
		}
	},

	/**
	 * Expose redaction function for custom use
	 */
	redact: redactSensitiveData
};

module.exports = logger;
