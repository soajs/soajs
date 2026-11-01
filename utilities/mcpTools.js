'use strict';

/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */

/**
 * Turns a service's input schema (config.js schema) into the tool definitions the gateway
 * serves over MCP: one per API, with a JSON Schema for its inputs and, per input, where it
 * goes in the HTTP request so the gateway can rebuild the API call from the tool arguments.
 */

const METHODS = ['get', 'post', 'put', 'delete'];

// Only these sources can be filled by the caller; headers, cookies, session, clientIP and
// servicesConfig are filled by the client or the platform, not by tool arguments.
const AGENT_SOURCES = ['params', 'query', 'body'];

const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];

let isObject = (obj) => {
	return !!obj && typeof obj === 'object' && !Array.isArray(obj);
};

let clone = (obj) => {
	return JSON.parse(JSON.stringify(obj));
};

/**
 * The validation blocks follow the old JSON Schema draft where required is a boolean on each
 * property. Rewrite them the current way: a required array on the parent object.
 * Property schemas that are not objects are dropped, they are not valid JSON Schema.
 */
let normalize = (schema) => {
	if (!isObject(schema)) {
		return schema;
	}
	let out = {};
	for (let key in schema) {
		if (Object.hasOwnProperty.call(schema, key)) {
			if (key === 'required' && typeof schema[key] === 'boolean') {
				continue;
			}
			out[key] = schema[key];
		}
	}
	if (isObject(schema.properties)) {
		let required = Array.isArray(schema.required) ? schema.required.slice() : [];
		out.properties = {};
		for (let prop in schema.properties) {
			if (Object.hasOwnProperty.call(schema.properties, prop) && DANGEROUS_KEYS.indexOf(prop) === -1) {
				let propSchema = schema.properties[prop];
				if (!isObject(propSchema)) {
					continue;
				}
				out.properties[prop] = normalize(propSchema);
				if (propSchema.required === true && required.indexOf(prop) === -1) {
					required.push(prop);
				}
			}
		}
		if (required.length > 0) {
			out.required = required;
		} else {
			delete out.required;
		}
	}
	if (isObject(schema.patternProperties)) {
		out.patternProperties = {};
		for (let pattern in schema.patternProperties) {
			if (Object.hasOwnProperty.call(schema.patternProperties, pattern)) {
				out.patternProperties[pattern] = normalize(schema.patternProperties[pattern]);
			}
		}
	}
	if (isObject(schema.additionalProperties)) {
		out.additionalProperties = normalize(schema.additionalProperties);
	}
	if (Array.isArray(schema.items)) {
		out.items = schema.items.map(normalize);
	} else if (isObject(schema.items)) {
		out.items = normalize(schema.items);
	}
	['oneOf', 'anyOf', 'allOf'].forEach((key) => {
		if (Array.isArray(schema[key])) {
			out[key] = schema[key].map(normalize);
		}
	});
	if (isObject(schema.not)) {
		out.not = normalize(schema.not);
	}
	return out;
};

/**
 * The first source the caller can fill decides where the input goes.
 * "query.keywords" -> {in: "query", path: ["keywords"]}, "body" -> {in: "body", path: [name]},
 * "body.user.id" -> {in: "body", path: ["user", "id"]}
 */
let placement = (name, sources) => {
	if (!Array.isArray(sources)) {
		return null;
	}
	for (let i = 0; i < sources.length; i++) {
		if (typeof sources[i] !== 'string') {
			continue;
		}
		let path = sources[i].split('.');
		let where = path.shift();
		if (AGENT_SOURCES.indexOf(where) === -1) {
			continue;
		}
		if (path.length === 0) {
			path = [name];
		}
		if (path.some((p) => DANGEROUS_KEYS.indexOf(p) !== -1)) {
			continue;
		}
		return {"in": where, "path": path};
	}
	return null;
};

/**
 * Path parameters of an express route: "/user/:id" -> [{name: "id", optional: false}].
 * Parameters inside braces are optional: "/file{/:name}".
 */
let pathParams = (route) => {
	let params = [];
	let depth = 0;
	for (let i = 0; i < route.length; i++) {
		let c = route[i];
		if (c === '{') {
			depth++;
		} else if (c === '}') {
			depth = Math.max(0, depth - 1);
		} else if (c === ':' || c === '*') {
			let match = route.slice(i + 1).match(/^[A-Za-z0-9_]+/);
			if (match) {
				params.push({"name": match[0], "optional": depth > 0});
				i += match[0].length;
			}
		}
	}
	return params;
};

let buildTool = (method, route, routeObj, commonFields) => {
	let apiInfo = isObject(routeObj._apiInfo) ? routeObj._apiInfo : {};
	let inputs = {};
	for (let field in routeObj) {
		if (Object.hasOwnProperty.call(routeObj, field) && field !== '_apiInfo' && field !== 'commonFields') {
			inputs[field] = routeObj[field];
		}
	}
	// same as the inputmask: commonFields named by the API are added, and win over local ones
	if (Array.isArray(routeObj.commonFields) && isObject(commonFields)) {
		routeObj.commonFields.forEach((field) => {
			if (Object.hasOwnProperty.call(commonFields, field)) {
				inputs[field] = commonFields[field];
			}
		});
	}

	let properties = {};
	let required = [];
	let fields = {};
	Object.keys(inputs).forEach((name) => {
		let input = inputs[name];
		if (DANGEROUS_KEYS.indexOf(name) !== -1 || !isObject(input)) {
			return;
		}
		let where = placement(name, input.source);
		if (!where) {
			return;
		}
		let property = isObject(input.validation) ? normalize(clone(input.validation)) : {};
		if (Object.hasOwnProperty.call(input, 'default')) {
			property.default = input.default;
		}
		properties[name] = property;
		fields[name] = where;
		if ((input.required === true && !Object.hasOwnProperty.call(input, 'default')) || where.in === 'params') {
			required.push(name);
		}
	});

	pathParams(route).forEach((param) => {
		let name = Object.keys(fields).find((field) => fields[field].in === 'params' && fields[field].path[0] === param.name);
		if (!name) {
			// not declared in the schema, or declared from query or body: the path value is the one used
			name = param.name;
			if (!Object.hasOwnProperty.call(properties, name)) {
				properties[name] = {"type": "string"};
			}
			fields[name] = {"in": "params", "path": [param.name]};
		}
		let index = required.indexOf(name);
		if (!param.optional && index === -1) {
			required.push(name);
		}
		if (param.optional && index !== -1) {
			required.splice(index, 1);
		}
	});

	let inputSchema = {"type": "object", "properties": properties};
	if (required.length > 0) {
		inputSchema.required = required;
	}

	let tool = {
		"m": method,
		"v": route,
		"l": apiInfo.l || (method.toUpperCase() + " " + route),
		"inputSchema": inputSchema,
		"fields": fields
	};
	if (apiInfo.group) {
		tool.group = apiInfo.group;
	}
	if (apiInfo.groupMain) {
		tool.groupMain = apiInfo.groupMain;
	}
	return tool;
};

/**
 * @param {object} schema the schema of a service config.js
 * @returns {Array} [{m, v, l, group, groupMain, inputSchema, fields}]
 *
 * Routes declared without a method (schema[route]) are skipped: the method they answer is not
 * known, so no API call can be built for them.
 */
function extractMCPTools(schema) {
	let tools = [];
	if (!isObject(schema)) {
		return tools;
	}
	METHODS.forEach((method) => {
		if (!isObject(schema[method])) {
			return;
		}
		for (let route in schema[method]) {
			if (Object.hasOwnProperty.call(schema[method], route) && isObject(schema[method][route])) {
				tools.push(buildTool(method, route, schema[method][route], schema.commonFields));
			}
		}
	});
	return tools;
}

module.exports = {
	extractMCPTools,
	normalize,
	placement,
	pathParams
};
