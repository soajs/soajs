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
	"serviceName": "hello",
	"serviceGroup": "SOAJS test",
	"servicePort": 4107,
	"requestTimeout": 30,
	"requestTimeoutRenewal": 5,
	"oauth": true,
	"extKeyRequired": true,
	"urac": true,
	
	
	"errors": {},
	"schema": {
		
		
		"get": {
			'/hello': {
				"_apiInfo": {
					"l": "HEllo world",
					"group": "SOAJS",
				}
			}
		}
	}
};