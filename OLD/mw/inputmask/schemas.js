'use strict';
var schemas = [
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
	            "description": {'type': 'string', 'required': false},
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
                        "l": {"type": "string", required: true},
                        "group": {"type": "string", required: false},
                        "groupMain": {"type": "boolean", required: false}
                    }
                },
	            "_authorization": {"type": "string"},
	            "responses": {
                	"type": "object",
		            "properties" : {},
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
                "serviceName": {"type": "string", "required": true},
                "serviceVersion": {"type": "string", "required": false},
                "serviceGroup": {"type": "string", "required": false},
                "type": {"type": "string", "enum": ['service', 'daemon', 'static', 'multi']},
                "extKeyRequired": {"type": "boolean", "required": false},
                "servicePort": {"type": "integer", "required": true},
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
            }
        }
    }
];

module.exports = function (validator) {
    var v = new validator.Validator();
    schemas.forEach(function (oneSchema) {
        v.addSchema(oneSchema.schema, oneSchema.label);
    });
    return v;
};
