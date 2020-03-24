'use strict';
let lib = {
	"_id": "5db1f85be9253564357b303d",
	"name": "oauth",
	"description": "SOAJS authentication with oauth 0 and 2.0 support in addition to 3rd party aka Azure AD, Github, ...",
	"type": "service",
	"configuration": {
		"subType": "soajs",
		"port": 4002,
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
					"label": "Releoad Provision",
					"path": "/loadProvision",
					"icon": "provision"
				},
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
					l: "Get the authorization token",
					v: "/authorization",
					m: "get",
					group: "Guest"
				},
				{
					l: "Login Through Passport",
					v: "/passport/login/:strategy",
					m: "get",
					group: "Guest Login(s)"
				},
				{
					l: "Login Through Passport Callback",
					v: "/passport/validate/:strategy",
					m: "get",
					group: "Guest Login(s)"
				},
				{
					l: "OpenAM Login",
					v: "/openam/login",
					m: "post",
					group: "Guest Login(s)"
				},
				{
					l: "Ldap Login",
					v: "/ldap/login",
					m: "post",
					group: "Guest Login(s)"
				},
				{
					l: "Create an access token",
					v: "/token",
					m: "post",
					group: "Guest"
				},
				{
					l: "Create an access token with pin",
					v: "/pin",
					m: "post",
					group: "Tokenization"
				},
				{
					l: "Delete access token",
					v: "/accessToken/:token",
					m: "delete",
					group: "Tokenization"
				},
				{
					l: "Delete refresh token",
					v: "/refreshToken/:token",
					m: "delete",
					group: "Tokenization"
				},
				{
					l: "Delete all tokens for a given user",
					v: "/tokens/user/:userId",
					m: "delete",
					group: "User Tokenization"
				},
				{
					l: "Delete all tokens for this client (tenant)",
					v: "/tokens/tenant/:clientId",
					m: "delete",
					group: "Cient Tokenization"
				}
			],
			"documentation": {}
		}
	],
	"metadata": {
		"tags": ["authentication", "authorization"],
		"program": ["soajs"]
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
		"owner": "soajs",
		"repo": "soajs.oauth"
	}
};
module.exports = lib;
