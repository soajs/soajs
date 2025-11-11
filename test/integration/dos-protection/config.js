/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */

'use strict';

module.exports = {
	type: 'service',
	prerequisites: {
		cpu: '',
		memory: ''
	},
	"serviceVersion": 1,
	"serviceName": "dosprotection",
	"serviceGroup": "SOAJS Security Test",
	"servicePort": 4110,
	"requestTimeout": 30,
	"requestTimeoutRenewal": 5,
	"oauth": false,
	"extKeyRequired": false,
	"urac": false,

	"errors": {},
	"schema": {
		"post": {
			'/testLargeBody': {
				"_apiInfo": {
					"l": "Test large request body",
					"group": "DoS Protection"
				}
			},
			'/testManyParams': {
				"_apiInfo": {
					"l": "Test many parameters",
					"group": "DoS Protection"
				},
				"commonFields": ['param1', 'param2', 'param3']
			},
			'/testJson': {
				"_apiInfo": {
					"l": "Test JSON parsing",
					"group": "DoS Protection"
				}
			}
		},
		"get": {
			'/health': {
				"_apiInfo": {
					"l": "Health check",
					"group": "DoS Protection"
				}
			}
		}
	}
};
