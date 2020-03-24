'use strict';
let lib = {
	"_id": "5db1f85be9253564357b303f",
	"name": "multitenant",
	"description": "SOAJS productization and multitenancy ",
	"type": "service",
	"configuration": {
		"subType": "soajs",
		"port": 4004,
		"group": "SOAJS Core Services",
		"requestTimeout": 30,
		"requestTimeoutRenewal": 5,
		"maintenance": {
			"port": {
				"type": "maintenance"
			},
			"readiness": "/heartbeat",
			"commands": [
				{
					"label": "Releoad Registry",
					"path": "/reloadRegistry",
					"icon": "registry"
				}, {
					"label": "Resource Info",
					"path": "/resourceInfo",
					"icon": "info"
				}
			]
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
					l: "List products",
					v: "/products",
					m: "get",
					group: "Product",
					groupMain: true
				},
				{
					l: "List console products",
					v: "/products/console",
					m: "get",
					group: "Console product",
					groupMain: true
				},
				{
					l: "Get product",
					v: "/product",
					m: "get",
					group: "Product",
					groupMain: true
				},
				{
					l: "List product packages",
					v: "/product/packages",
					m: "get",
					group: "Product"
				},
				{
					l: "Get product package",
					v: "/product/package",
					m: "get",
					group: "Product"
				},
				{
					l: "List tenants",
					v: "/tenants",
					m: "get",
					group: "Tenant"
				},
				{
					l: "Get tenant",
					v: "/tenant",
					m: "get",
					group: "Tenant"
				},
				{
					l: "Get tenant",
					v: "/admin/tenant",
					m: "get",
					group: "Admin Tenant"
				},
				{
					l: "Get tenant application",
					v: "/tenant/application",
					m: "get",
					group: "Tenant"
				},
				{
					l: "Get tenant application",
					v: "/admin/tenant/application",
					m: "get",
					group: "Admin Tenant"
				},
				{
					l: "List tenant applications",
					v: "/tenant/applications",
					m: "get",
					group: "Tenant"
				},
				{
					l: "List tenant applications",
					v: "/admin/tenant/applications",
					m: "get",
					group: "Admin Tenant"
				},
				{
					l: "List tenant application ext keys",
					v: "/tenant/application/key/ext",
					m: "get",
					group: "Tenant"
				},
				{
					l: "List tenant application ext keys",
					v: "/admin/tenant/application/key/ext",
					m: "get",
					group: "Admin Tenant"
				},
				{
					l: "Add product",
					v: "/product",
					m: "post",
					group: "Product",
					groupMain: true
				},
				{
					l: "Add package to product",
					v: "/product/package",
					m: "post",
					group: "Product"
				},
				{
					l: "Add tenant with optional application, key, and ext key",
					v: "/tenant",
					m: "post",
					group: "Tenant"
				},
				{
					l: "Add application to tenant with optional key and ext key",
					v: "/tenant/application",
					m: "post",
					group: "Tenant"
				},
				{
					l: "Add application to tenant with optional key and ext key",
					v: "/admin/tenant/application",
					m: "post",
					group: "Admin Tenant"
				},
				{
					l: "Add key to a tenant application with optional ext key",
					v: "/tenant/application/key",
					m: "post",
					group: "Tenant"
				},
				{
					l: "Add key to a tenant application with optional ext key",
					v: "/admin/tenant/application/key",
					m: "post",
					group: "Admin Tenant"
				},
				{
					l: "Add external key to tenant application",
					v: "/tenant/application/key/ext",
					m: "post",
					group: "Tenant Access"
				},
				{
					l: "Add external key to tenant application",
					v: "/admin/tenant/application/key/ext",
					m: "post",
					group: "Admin Tenant"
				},
				{
					l: "Delete product",
					v: "/product",
					m: "delete",
					group: "Product",
					groupMain: true
				},
				{
					l: "Delete product package",
					v: "/product/package",
					m: "delete",
					group: "Product"
				},
				{
					l: "Delete Tenant",
					v: "/tenant",
					m: "delete",
					group: "Tenant"
				},
				{
					l: "Delete tenant application",
					v: "/tenant/application",
					m: "delete",
					group: "Tenant"
				},
				{
					l: "Delete tenant application key",
					v: "/tenant/application/key",
					m: "delete",
					group: "Tenant"
				},
				{
					l: "Delete tenant application external key",
					v: "/tenant/application/key/ext",
					m: "delete",
					group: "Tenant Access"
				},
				{
					l: "Purge ACL for a Product and all its packages",
					v: "/product/purge",
					m: "put",
					group: "Product"
				},
				{
					l: "Update product",
					v: "/product",
					m: "put",
					group: "Product"
				},
				{
					l: "Update product ACL scope",
					v: "/product/scope",
					m: "put",
					group: "Product"
				},
				{
					l: "Update product package",
					v: "/product/package",
					m: "put",
					group: "Product"
				},
				{
					l: "Update tenant",
					v: "/tenant",
					m: "put",
					group: "Tenant"
				},
				{
					l: "Update tenant",
					v: "/admin/tenant",
					m: "put",
					group: "Admin Tenant"
				},
				{
					l: "Update profile",
					v: "/tenant/profile",
					m: "put",
					group: "Tenant"
				},
				{
					l: "Update profile",
					v: "/admin/tenant/profile",
					m: "put",
					group: "Admin Tenant"
				},
				{
					l: "Update tenant application",
					v: "/tenant/application",
					m: "put",
					group: "Tenant"
				},
				{
					l: "Update tenant application",
					v: "/admin/tenant/application",
					m: "put",
					group: "Admin Tenant"
				},
				{
					l: "Update key information for a tenant application",
					v: "/tenant/application/key",
					m: "put",
					group: "Tenant"
				},
				{
					l: "Update key information for a tenant application",
					v: "/admin/tenant/application/key",
					m: "put",
					group: "Admin Tenant"
				},
				{
					l: "Update external key information for a tenant application",
					v: "/tenant/application/key/ext",
					m: "put",
					group: "Tenant Access"
				},
				{
					l: "Update external key information for a tenant application",
					v: "/admin/tenant/application/key/ext",
					m: "put",
					group: "Admin Tenant"
				}
			],
			"documentation": {}
		}
	],
	"metadata": {
		"tags": ["productization", "multitenant"],
		"program": ["soajs"]
	},
	"ui": {
		"main": "Console",
		"sub": ""
	},
	"settings": {
		"acl": {},
		"recipes": [],
		"environments": {}
	},
	"src": {
		"provider": "github",
		"owner": "soajs",
		"repo": "soajs.multitenant"
	}
};
module.exports = lib;
