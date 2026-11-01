"use strict";
/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */

const helper = require("../../helper.js");
const assert = require('assert');

let mcpTools = helper.requireModule('./utilities/mcpTools.js');

describe("Testing utilities mcpTools", () => {

	let schema = {
		"commonFields": {
			"limit": {
				"source": ["query.limit", "body.limit"],
				"default": 1000,
				"validation": {"type": "integer", "max": 2000}
			},
			"keywords": {
				"source": ["query.keywords", "body.keywords"],
				"validation": {"type": "string"}
			}
		},
		"get": {
			"/password/forgot": {
				"_apiInfo": {"l": "Forgot password", "group": "My account guest"},
				"username": {
					"source": ["query.username"],
					"required": true,
					"validation": {"type": "string"}
				}
			},
			"/users": {
				"_apiInfo": {"l": "List users"},
				"commonFields": ["limit", "keywords"],
				"keywords": {
					"source": ["query.keywords"],
					"validation": {"type": "integer"}
				}
			},
			"/no/info": {}
		},
		"post": {
			"/user/:id": {
				"_apiInfo": {"l": "Update user", "group": "Admin", "groupMain": true},
				"id": {
					"source": ["params.id"],
					"validation": {"type": "string"}
				},
				"profile": {
					"source": ["body.profile"],
					"required": true,
					"validation": {
						"type": "object",
						"properties": {
							"firstName": {"type": "string", "required": true},
							"lastName": {"type": "string"},
							"oneOf": [{"type": "string"}],
							"address": {
								"type": "object",
								"properties": {
									"city": {"type": "string", "required": true}
								}
							},
							"tags": {
								"type": "array",
								"items": {
									"type": "object",
									"properties": {"name": {"type": "string", "required": true}}
								}
							}
						}
					}
				},
				"email": {
					"source": ["body.contact.email"],
					"validation": {"type": "string", "format": "email"}
				},
				"token": {
					"source": ["headers.token"],
					"required": true,
					"validation": {"type": "string"}
				},
				"tenant": {
					"source": ["servicesConfig.tenant"],
					"validation": {"type": "object"}
				}
			}
		},
		"delete": {
			"/file/:folder{/:name}": {
				"_apiInfo": {"l": "Delete file"}
			}
		},
		"/legacy/route": {
			"_apiInfo": {"l": "No method"}
		}
	};

	let tools = mcpTools.extractMCPTools(schema);
	let find = (m, v) => {
		return tools.find((tool) => tool.m === m && tool.v === v);
	};

	it("Success - one tool per API with a method, legacy routes skipped", (done) => {
		assert.deepStrictEqual(tools.map((tool) => tool.m + " " + tool.v), [
			"get /password/forgot",
			"get /users",
			"get /no/info",
			"post /user/:id",
			"delete /file/:folder{/:name}"
		]);
		done();
	});

	it("Success - label, group and a query input", (done) => {
		assert.deepStrictEqual(find("get", "/password/forgot"), {
			"m": "get",
			"v": "/password/forgot",
			"l": "Forgot password",
			"group": "My account guest",
			"inputSchema": {
				"type": "object",
				"properties": {"username": {"type": "string"}},
				"required": ["username"]
			},
			"fields": {"username": {"in": "query", "path": ["username"]}}
		});
		done();
	});

	it("Success - commonFields are added and win over local fields, a default is not required", (done) => {
		let tool = find("get", "/users");
		assert.deepStrictEqual(tool.inputSchema, {
			"type": "object",
			"properties": {
				"keywords": {"type": "string"},
				"limit": {"type": "integer", "max": 2000, "default": 1000}
			}
		});
		assert.deepStrictEqual(tool.fields, {
			"keywords": {"in": "query", "path": ["keywords"]},
			"limit": {"in": "query", "path": ["limit"]}
		});
		done();
	});

	it("Success - no _apiInfo gives a label from the method and path", (done) => {
		let tool = find("get", "/no/info");
		assert.deepStrictEqual(tool.l, "GET /no/info");
		assert.deepStrictEqual(tool.inputSchema, {"type": "object", "properties": {}});
		assert.ok(!tool.group);
		done();
	});

	it("Success - params, nested body path, required arrays, inputs the caller cannot fill left out", (done) => {
		let tool = find("post", "/user/:id");
		assert.deepStrictEqual(tool.group, "Admin");
		assert.deepStrictEqual(tool.groupMain, true);
		assert.deepStrictEqual(tool.fields, {
			"id": {"in": "params", "path": ["id"]},
			"profile": {"in": "body", "path": ["profile"]},
			"email": {"in": "body", "path": ["contact", "email"]}
		});
		assert.deepStrictEqual(tool.inputSchema.required, ["id", "profile"]);
		assert.deepStrictEqual(tool.inputSchema.properties.profile, {
			"type": "object",
			"properties": {
				"firstName": {"type": "string"},
				"lastName": {"type": "string"},
				"address": {
					"type": "object",
					"properties": {"city": {"type": "string"}},
					"required": ["city"]
				},
				"tags": {
					"type": "array",
					"items": {
						"type": "object",
						"properties": {"name": {"type": "string"}},
						"required": ["name"]
					}
				}
			},
			"required": ["firstName"]
		});
		assert.deepStrictEqual(tool.inputSchema.properties.email, {"type": "string", "format": "email"});
		done();
	});

	it("Success - path params not in the schema are added, optional ones are not required", (done) => {
		let tool = find("delete", "/file/:folder{/:name}");
		assert.deepStrictEqual(tool.inputSchema, {
			"type": "object",
			"properties": {
				"folder": {"type": "string"},
				"name": {"type": "string"}
			},
			"required": ["folder"]
		});
		assert.deepStrictEqual(tool.fields, {
			"folder": {"in": "params", "path": ["folder"]},
			"name": {"in": "params", "path": ["name"]}
		});
		done();
	});

	it("Success - a path param also read from the query is taken from the path", (done) => {
		let list = mcpTools.extractMCPTools({
			"get": {
				"/item/:id": {
					"id": {"source": ["query.id"], "validation": {"type": "string", "pattern": "^[a-f0-9]+$"}}
				}
			}
		});
		assert.deepStrictEqual(list[0].fields, {"id": {"in": "params", "path": ["id"]}});
		assert.deepStrictEqual(list[0].inputSchema, {
			"type": "object",
			"properties": {"id": {"type": "string", "pattern": "^[a-f0-9]+$"}},
			"required": ["id"]
		});
		done();
	});

	it("Success - the service schema is not changed", (done) => {
		assert.deepStrictEqual(schema.post["/user/:id"].profile.validation.properties.firstName, {
			"type": "string",
			"required": true
		});
		done();
	});

	it("Success - dangerous keys are skipped", (done) => {
		let routeObj = JSON.parse('{"__proto__": {"source": ["query.x"], "validation": {"type": "string"}}, "x": {"source": ["body.__proto__.y"], "validation": {"type": "string"}}, "ok": {"source": ["query.ok"], "validation": {"type": "string"}}}');
		let list = mcpTools.extractMCPTools({"get": {"/a": routeObj}});
		assert.deepStrictEqual(list[0].fields, {"ok": {"in": "query", "path": ["ok"]}});
		done();
	});

	it("Success - empty or invalid schema", (done) => {
		assert.deepStrictEqual(mcpTools.extractMCPTools(null), []);
		assert.deepStrictEqual(mcpTools.extractMCPTools({}), []);
		assert.deepStrictEqual(mcpTools.extractMCPTools({"get": []}), []);
		done();
	});

	it("Success - placement", (done) => {
		assert.deepStrictEqual(mcpTools.placement("a", ["headers.a", "body"]), {"in": "body", "path": ["a"]});
		assert.deepStrictEqual(mcpTools.placement("a", ["session.a", "clientIP"]), null);
		assert.deepStrictEqual(mcpTools.placement("a", null), null);
		done();
	});

	it("Success - pathParams", (done) => {
		assert.deepStrictEqual(mcpTools.pathParams("/a/:b/c{/:d}/*rest"), [
			{"name": "b", "optional": false},
			{"name": "d", "optional": true},
			{"name": "rest", "optional": false}
		]);
		assert.deepStrictEqual(mcpTools.pathParams("/plain"), []);
		done();
	});
});
