"use strict";
var assert = require('assert');
var helper = require("../helper.js");
var soajsMongo = helper.requireModule('./index.js').mongo;
var contentBuilder = helper.requireModule('./index.js').contentBuilder;

var gcSchema = {
	"name": "news",
	"author": "owner",
	"genericService": {
		"config": {
			"serviceName": "news",
			"servicePort": 4100,
			"requestTimeout": 30,
			"requestTimeoutRenewal": 5,
			"extKeyRequired": false,
			"awareness": false,
			"errors": {
				"400": "Error retrieving news entry(ies).",
				"401": "Error adding news Entry.",
				"402": "Error updating news Entry.",
				"403": "Error removing news Entry.",
				"404": "Invalid News Id provided."
			},
			"schema": {
				"commonFields": {
					"title": {
						"source": [
							"body.title"
						],
						"validation": {
							"type": "string",
							"minLength": 5
						},
						"required": true
					},
					"description": {
						"source": [
							"body.description"
						],
						"validation": {
							"type": "string"
						},
						"required": true
					},
					"status": {
						"source": [
							"body.status"
						],
						"validation": {
							"type": "string",
							"enum": [
								"published",
								"unpublished"
							]
						},
						"required": true
					},
					"id": {
						"source": [
							"query.id"
						],
						"validation": {
							"type": "string"
						},
						"required": true
					},
					"summary": {
						"source": [
							"body.summary"
						],
						"validation": {
							"type": "string"
						},
						"required": true
					}
				},
				"/list": {
					"_apiInfo": {
						"l": "List News Entries",
						"group": "News",
						"groupMain": true
					}
				},
				"/get": {
					"_apiInfo": {
						"l": "Get One News Entry",
						"group": "News"
					},
					"commonFields": [
						"id"
					]
				},
				"/delete": {
					"_apiInfo": {
						"l": "Remove News Entry",
						"group": "News"
					},
					"commonFields": [
						"id"
					]
				},
				"/restore": {
					"_apiInfo": {
						"l": "Restore News Entry",
						"group": "News"
					},
					"commonFields": [
						"id"
					]
				},
				"/add": {
					"_apiInfo": {
						"l": "Add News Entry",
						"group": "News"
					},
					"commonFields": [
						"title",
						"description",
						"summary"
					]
				},
				"/update": {
					"_apiInfo": {
						"l": "Update News Entry",
						"group": "News"
					},
					"commonFields": [
						"id",
						"title",
						"description",
						"status",
						"summary"
					]
				}
			}
		},
		"options": {
			"session": false,
			"multitenant": true,
			"acl": false,
			"security": false,
			"oauth": false
		}
	},
	"soajsService": {
		"db": {
			"collection": "data",
			"multitenant": true,
			"config": {
				"DEV": {
					"news": {
						"tenantSpecific": true,
						"cluster": "cluster1"
					}
				}
			}
		},
		"apis": {
			"/list": {
				"method": "post",
				"mw": {
					"code": 400
				},
				"type": "get",
				"workflow": {
					"preExec": "req.soajs.log.debug(\"YOU HAVE REACHED THE LIST DATA API\");\nnext();",
					"postExec": "req.soajs.log.debug(\"YOU ARE LEAVING THE LIST DATA API\");\nnext();"
				}
			},
			"/get": {
				"method": "get",
				"mw": {
					"code": 400
				},
				"type": "get",
				"workflow": {
					"preExec": "//some custom instructions to execute if any otherwise this function is ignored....req.soajs.log.debug(\"YOU HAVE REACHED THE GET DATA API\");try {\treq.soajs.dataMw.db.condition = {'_id': req.soajs.dataMw.mongo.ObjectId(req.soajs.inputmaskData.id)};\tnext();}catch(e) {\treturn res.jsonp(req.soajs.buildResponse({\"code\": 404, \"msg\": e.message}));}next();"
				}
			},
			"/delete": {
				"method": "get",
				"mw": {
					"code": 403
				},
				"type": "delete",
				"workflow": {
					"preExec": "//some custom instructions to execute if any otherwise this function is ignored....req.soajs.log.debug(\"YOU HAVE REACHED THE GET DATA API\");try {\treq.soajs.dataMw.db.condition = {'_id': req.soajs.dataMw.mongo.ObjectId(req.soajs.inputmaskData.id)};\tnext();}catch(e) {\treturn res.jsonp(req.soajs.buildResponse({\"code\": 404, \"msg\": e.message}));}next();"
				}
			},
			"/restore": {
				"method": "get",
				"mw": {
					"code": 403
				},
				"type": "restore",
				"workflow": {
					"preExec": "//some custom instructions to execute if any otherwise this function is ignored....req.soajs.log.debug(\"YOU HAVE REACHED THE GET DATA API\");try {\treq.soajs.dataMw.db.condition = {'_id': req.soajs.dataMw.mongo.ObjectId(req.soajs.inputmaskData.id)};\tnext();}catch(e) {\treturn res.jsonp(req.soajs.buildResponse({\"code\": 404, \"msg\": e.message}));}next();"
				}
			},
			"/add": {
				"type": "add",
				"method": "post",
				"mw": {
					"code": 401,
					"model": "add"
				},
				"workflow": {}
			},
			"/update": {
				"method": "post",
				"mw": {
					"code": 402,
					"model": "update"
				},
				"type": "update",
				"workflow": {
					"preExec": "//some custom instructions to execute if any otherwise this function is ignored....req.soajs.log.debug(\"YOU HAVE REACHED THE GET DATA API\");try {\treq.soajs.dataMw.db.condition = {'_id': req.soajs.dataMw.mongo.ObjectId(req.soajs.inputmaskData.id)};\tnext();}catch(e) {\treturn res.jsonp(req.soajs.buildResponse({\"code\": 404, \"msg\": e.message}));}next();"
				}
			}
		}
	},
	"soajsUI": {
		"list": {
			"columns": [
				{
					"label": "Title",
					"name": "title",
					"field": "fields.title"
				},
				{
					"label": "Status",
					"name": "status",
					"field": "fields.status"
				},
				{
					"label": "Created",
					"field": "created",
					"filter": "date"
				},
				{
					"label": "Modified",
					"field": "modified",
					"filter": "date"
				},
				{
					"label": "Author",
					"field": "author"
				},
				{
					"label": "Content Summary",
					"name": "summary",
					"field": "fields.summary"
				}
			],
			"defaultSortField": "Title"
		},
		"form": {
			"add": [
				{
					"name": "title",
					"label": "Title",
					"placeholder": "My News Entry...",
					"value": "",
					"tooltip": "Enter the title of news entry, this field is mandatory",
					"type": "text",
					"required": true
				},
				{
					"name": "description",
					"label": "Description",
					"placeholder": "News Content ...",
					"value": "",
					"tooltip": "Use the editor to enter the content of the News entry",
					"type": "editor",
					"required": true
				},
				{
					"name": "summary",
					"label": "Summary",
					"placeholder": "News Content Summary...",
					"value": "",
					"tooltip": "Provide a summary to your news entry",
					"type": "editor",
					"required": false
				}
			],
			"update": [
				{
					"name": "title",
					"label": "Title",
					"placeholder": "My News Entry...",
					"value": "",
					"tooltip": "Enter the title of news entry, this field is mandatory",
					"type": "text",
					"required": true
				},
				{
					"name": "description",
					"label": "Description",
					"placeholder": "News Content ...",
					"value": "",
					"tooltip": "Use the editor to enter the content of the News entry",
					"type": "editor",
					"required": true
				},
				{
					"name": "status",
					"label": "Status",
					"value": [
						{
							"v": "published",
							"selected": true
						},
						{
							"v": "unpublished"
						}
					],
					"type": "radio",
					"required": true
				},
				{
					"name": "summary",
					"label": "Summary",
					"placeholder": "News Content Summary...",
					"value": "",
					"tooltip": "Provide a summary to your news entry",
					"type": "editor",
					"required": false
				}
			]
		}
	},
	"v": 13,
	"ts": 1434026679627,
	"modified": 1434026729858
};

describe("testing contentBuilder", function() {
	var mongo = null;
	before(function(done) {
		var dbConfig = {
			"name": 'core_provision',
			"prefix": "",
			"servers": [
				{
					"host": "127.0.0.1",
					"port": "27017"
				}
			],
			"credentials": null,
			"URLParam": {
				"connectTimeoutMS": 0,
				"socketTimeoutMS": 0,
				"maxPoolSize": 5,
				"w": 1,
				"wtimeoutMS": 0,
				"slaveOk": true
			},
			"extraParam": {
				"db": {
					"native_parser": true
				},
				"server": {
					"auto_reconnect": true
				}
			},
			'store': {},
			"collection": "sessions",
			'stringify': false,
			'expireAfter': 1000 * 60 * 60 * 24 * 14 // 2 weeks
		};
		mongo = new soajsMongo(dbConfig);

		mongo.remove("gc", {}, function(error) {
			assert.ifError(error);
			mongo.remove("gc_versioning", {}, function(error) {
				assert.ifError(error);
				done();
			});
		});
	});

	after(function(done){
		mongo.remove("gc", {}, function(error) {
			assert.ifError(error);
			mongo.remove("gc_versioning", {}, function(error) {
				assert.ifError(error);
				mongo.closeDb();
				done();
			});
		});
	});

	it("fail - no service name ", function(done) {
		var serviceInfo = {'version': 13};
		contentBuilder(serviceInfo, function(error, config) {
			assert.ok(error);
			assert.ok(error.code, 190);
			assert.ok(!config);
			done();
		});
	});

	it("fail - no service version", function(done) {
		var serviceInfo = {'name': 'news'};
		contentBuilder(serviceInfo, function(error, config) {
			assert.ok(error);
			assert.ok(error.code, 191);
			assert.ok(!config);
			done();
		});
	});

	it("fail - service version wrong format", function(done) {
		var serviceInfo = {'name': 'news', 'version': '13'};
		contentBuilder(serviceInfo, function(error, config) {
			assert.ok(error);
			assert.ok(error.code, 191);
			assert.ok(!config);
			done();
		});
	});

	it("insert new gc service", function(done) {
		mongo.insert('gc', gcSchema, function(error) {
			assert.ifError(error);
			done();
		});
	});

	it("success - load Schema", function(done) {
		var serviceInfo = {'name': 'news', 'version': 13};
		contentBuilder(serviceInfo, function(error, config) {
			assert.ifError(error);
			assert.ok(config);
			assert.equal(config.name, gcSchema.name);
			assert.equal(config.v, gcSchema.v);
			assert.ok(config.genericService);
			assert.ok(config.soajsService);
			assert.ok(config.soajsUI);
			assert.ok(config.author);
			assert.ok(config.ts);
			done();
		});
	});
});