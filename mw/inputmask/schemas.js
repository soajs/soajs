'use strict';

/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */

let schemas = [
	{
		'label': '/soajs/Errors',
		'schema': {
			"type": "object",
			"patternProperties": {
				'^[1-9][0-9]{0,2}$': {
					"type": "string"
				}
			},
			"additionalProperties": false
		}
	},
	{
		'label': '/soajs/Field',
		'schema': {
			"type": "object",
			"properties": {
				"source": {'type': 'array', 'minItems': 1, 'items': {'type': 'string'}},
				"description": {'type': 'string'},
				"default": {"type": ["string", "number", "boolean", "array", "object"]},
				"required": {"type": "boolean"},
				"validation": {"type": "object"}
			},
			"additionalProperties": false
		}
	},
	{
		'label': '/soajs/input',
		'schema': {
			"type": "object",
			"properties": {
				"commonFields": {
					"type": "array",
					"items": {
						"type": "string",
						"pattern": "^[_a-z][_a-zA-Z0-9]*$"
					},
					"uniqueItems": true,
					"minItems": 1
				},
				"_apiInfo": {
					"type": "object",
					"properties": {
						"l": {"type": "string"},
						"group": {"type": "string"},
						"groupMain": {"type": "boolean"}
					},
					"required": ["l"]
				},
				"_authorization": {"type": "string"},
				"responses": {
					"type": "object",
					"properties": {},
					"additionalProperties": true
				}
			},
			"patternProperties": {
				"^(?!commonFields|_apiInfo|_authorization|responses)[_a-z][_a-zA-Z0-9]*$": {"$ref": "/soajs/Field"}
			},
			"additionalProperties": false
		}
	},
	{
		'label': '/soajs/route',
		'schema': {
			"type": "object",
			"patternProperties": {
				'^(?!commonFields)[_a-z\/][_a-zA-Z0-9\/:]*$': {"$ref": "/soajs/input"}
			}
		},
		"additionalProperties": false
	},
	{
		'label': '/soajs/CommonFields/input',
		'schema': {
			"type": "object",
			"patternProperties": {
				"^(?!commonFields)[_a-z][_a-zA-Z0-9]*$": {"$ref": "/soajs/Field"}
			},
			"additionalProperties": false
		}
	},
	{
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
	}
];

module.exports = function (validator) {
	let v = new validator.Validator();
	schemas.forEach((oneSchema) => {
		v.addSchema(oneSchema.schema, oneSchema.label);
	});
	return v;
};
