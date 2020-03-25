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
	"serviceName": "inputmask",
	"serviceGroup": "SOAJS test",
	"servicePort": 4108,
	"requestTimeout": 30,
	"requestTimeoutRenewal": 5,
	"oauth": false,
	"extKeyRequired": false,
	
	"errors": {},
	"schema": {}
};