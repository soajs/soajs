'use strict';
let lib = {
	"_id": "5e409c94c5a59210a815262c",
	"name": "pay",
	"description": "MS pay service for marketplace",
	"type": "service",
	"configuration": {
		"subType": "ecommerce",
		"port": 4102,
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
					l: "pay items",
					v: "/pay",
					m: "post",
					group: "Pay"
				},
				{
					l: "Get all pay ",
					v: "/pays",
					m: "get",
					group: "Pay"
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
		"acl": {
			"public": {
				"ro": true
			}
		},
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
