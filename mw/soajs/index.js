'use strict';

/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */

/**
 *
 * @param configuration
 * @returns {Function}
 */
module.exports = (configuration) => {
	let log = configuration.log;
	let core = configuration.core;
	
	return (req, res, next) => {
		if (!req.soajs) {
			req.soajs = {};
		}
		req.soajs.log = log;
		req.soajs.registry = core.registry.get();
		req.soajs.meta = core.meta;
		req.soajs.validator = core.validator;
		return next();
	};
};
