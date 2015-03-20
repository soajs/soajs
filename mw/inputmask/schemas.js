'use strict';
var schemas = [
	{
		'label': '/soajs/Errors',
		'schema': {
			"title": "Errors",
			"description": "Key-value pairs of error codes and their descriptions",
			"type": "object",
			"patternProperties": {
				'^[1-9][0-9]{0,2}$': {
					"type": "string",
					"description": "The error code and description"
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
					"title": "Common Fields Reference",
					"type": "array",
					"items": {
						"type": "string",
						"pattern": "^[_a-z][_a-zA-Z0-9]*$"
					},
					"uniqueItems": true,
					"minItems": 1
				}
			},
			"patternProperties": {
				"^(?!commonFields)[_a-z][_a-zA-Z0-9]*$": {"$ref": "/soajs/Field"}
			},
			"additionalProperties": false
		}
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
			"title": "Config Schema",
			"type": "object",
			"properties": {
				"errors": {"$ref": "/soajs/Errors"},
				"schema": {
					"properties": {
						"commonFields": {"$ref": "/soajs/CommonFields/input"}
					},
					"patternProperties": {
						'^(?!commonFields)[_a-z\/][_a-zA-Z0-9\/:]*$': {"$ref": "/soajs/input"}
					},
					"additionalProperties": false
				}
			}
		}
	}
];

module.exports = function(validator) {
	var v = new validator.Validator();
	schemas.forEach(function(oneSchema) {
		v.addSchema(oneSchema.schema, oneSchema.label);
	});
	return v;
};
