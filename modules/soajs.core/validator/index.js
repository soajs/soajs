'use strict';
var jsonschema = require('jsonschema');

if (jsonschema.SchemaPatterns || process.env.APP_DIR_FOR_CODE_COVERAGE) {
	if(!jsonschema.SchemaPatterns){
		jsonschema.SchemaPatterns = {};
	}
    jsonschema.SchemaPatterns['route'] = /^[_a-z\/][_a-zA-Z0-9\/:]*$/;
    jsonschema.SchemaPatterns['domain'] = /^([A-Za-z0-9-]*\.)+[a-zA-Z]{2,4}(\.[a-zA-Z]{2})?$/;
}

if(!jsonschema.SchemaPatterns || process.env.APP_DIR_FOR_CODE_COVERAGE){
	if(!jsonschema.SchemaPatterns){
		jsonschema.SchemaPatterns = {};
	}
    jsonschema.SchemaPatterns['email'] = /^(?:[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+\.)*[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+@(?:(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!\.)){0,61}[a-zA-Z0-9]?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!$)){0,61}[a-zA-Z0-9]?)|(?:\[(?:(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\.){3}(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\]))$/;
}

/* Validator Component
 *
 * REF: https://www.npmjs.com/package/jsonschema
 */
module.exports.Validator = jsonschema.Validator;
module.exports.SchemaPatterns = jsonschema.SchemaPatterns;
