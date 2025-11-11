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
	"serviceName": "sessionsecurity",
	"serviceGroup": "SOAJS Security Test",
	"servicePort": 4109,
	"requestTimeout": 30,
	"requestTimeoutRenewal": 5,
	"oauth": false,
	"extKeyRequired": false,
	"urac": false,

	"errors": {},
	"schema": {
		"post": {
			'/login': {
				"_apiInfo": {
					"l": "Test login with session regeneration",
					"group": "Session"
				}
			},
			'/setSession': {
				"_apiInfo": {
					"l": "Set session data",
					"group": "Session"
				}
			}
		},
		"get": {
			'/getSession': {
				"_apiInfo": {
					"l": "Get session data",
					"group": "Session"
				}
			},
			'/checkSessionId': {
				"_apiInfo": {
					"l": "Check session ID",
					"group": "Session"
				}
			}
		}
	}
};
