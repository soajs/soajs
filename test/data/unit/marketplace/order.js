'use strict';
let lib = {
	"_id": "5e409c82c5a59210a815262b",
	"name": "order",
	"description": "MS order service for marketplace",
	"type": "service",
	"configuration": {
		"subType": "ecommerce",
		"port": 4101,
		"group": "Marketplace",
		"requestTimeout": 30,
		"requestTimeoutRenewal": 5,
		"maintenance": {
			"port": {
				"type": "maintenance"
			},
			"readiness": "/heartbeat"
		}
	},
	"versions": [
		{
			"version": "1",
			"extKeyRequired": true,
			"oauth": true,
			"provision_ACL": false,
			"tenant_Profile": false,
			"urac": false,
			"urac_ACL": false,
			"urac_Config": false,
			"urac_GroupConfig": false,
			"urac_Profile": false,
			"apis": [
				{
					l: "Order items",
					v: "/items",
					m: "post",
					group: "Cart"
				},
				{
					l: "Get all orders ",
					v: "/orders",
					m: "get",
					group: "Cart"
				}
			],
			"documentation": {}
		}
	],
	"metadata": {
		"tags": ["order", "ecommerce"],
		"program": ["marketplace"]
	},
	"ui": {
		"main": "Gateway",
		"sub": ""
	},
	"settings": {
		"acl": {},
		"recipes": [],
		"environments": {}
	},
	"src": {
		"provider": "github",
		"owner": "ht",
		"repo": "mkpl.order"
	}
};
module.exports = lib;
