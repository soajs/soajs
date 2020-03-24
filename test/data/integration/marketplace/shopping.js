'use strict';
let lib = {
	"_id": "5e3ef3f9c5a59210a815262a",
	"name": "shopping",
	"description": "MS shopping cart service for marketplace",
	"type": "service",
	"configuration": {
		"subType": "ecommerce",
		"port": 4100,
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
					l: "Get shopping cart items",
					v: "/items",
					m: "get",
					group: "Cart"
				},
				{
					l: "Get all carts ",
					v: "/carts",
					m: "get",
					group: "Cart"
				}
			],
			"documentation": {}
		}
	],
	"metadata": {
		"tags": ["cart", "ecommerce"],
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
		"repo": "mkpl.cart"
	}
};
module.exports = lib;
