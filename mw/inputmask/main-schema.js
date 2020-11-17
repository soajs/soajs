'use strict';

/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */

module.exports = {
	'label': '/soajs',
	'schema': {
		"type": "object",
		"properties": {
			"serviceName": {"type": "string"},
			"serviceVersion": {"type": "string"},
			"serviceGroup": {"type": "string"},
			"type": {"type": "string", "enum": ['service', 'daemon', 'static', 'multi']},
			"extKeyRequired": {"type": "boolean"},
			"servicePort": {"type": "integer"},
			"errors": {"$ref": "/soajs/Errors"},
			"schema": {
				"type": "object",
				"properties": {
					"commonFields": {"$ref": "/soajs/CommonFields/input"},
					"get": {"$ref": "/soajs/route"},
					"post": {"$ref": "/soajs/route"},
					"put": {"$ref": "/soajs/route"},
					"delete": {"$ref": "/soajs/route"}
				},
				"patternProperties": {
					'^(?!commonFields)(?!get)(?!post)(?!put)(?!delete)[_a-z\/][_a-zA-Z0-9\/:]*$': {"$ref": "/soajs/input"}
				},
				"additionalProperties": false
			}
		},
		"required": ["serviceName", "servicePort"]
	}
};


