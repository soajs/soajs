"use strict";

/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */

const fs = require('fs');
let regFile = (process.env.SOAJS_PROFILE || __dirname + "/../../profiles/solo.json");

module.exports = {
	"fetchRegistry": function (param, options, cb) {
		if (fs.existsSync(regFile)) {
			delete require.cache[require.resolve(regFile)];
			let regFileObj = require(regFile);
			return cb(null, regFileObj);
		} else {
			return cb(new Error('Invalid profile file: ' + regFile));
		}
	}
};