'use strict';

module.exports = function(ObjectId) {
	return ({
		"_id": new ObjectId("10d2cb5fc04ce51e06000001"),
		"oauth": {
			"secret": "shhh this is a secret",
			"redirectUri": "",
			"grants": ["password", "refresh_token"]
		},
		"code": "test",
		"name": "Test Tenant",
		"description": "this is a description for test tenant",
		"applications": [
			{
				"product": "TPROD",
				"package": "TPROD_BASIC",
				"appId": new ObjectId("30d2cb5fc04ce51e06000001"),
				"description": "this is a description for app for test tenant for test product and basic package",
				"acl": {
					"urac": {},
					"dashboard": {}
				},
				"_TTL": 7 * 24 * 3600 * 1000, // 7 days hours
				"keys": [
					{
						"key": "d1eaaf5fdc35c11119330a8a0273fee9",
						"extKeys": [
							{
								"expDate": new Date().getTime() + 7 * 24 * 3600 * 1000, // + 7 days
								"extKey": "aa39b5490c4a4ed0e56d7ec1232a428f771e8bb83cfcee16de14f735d0f5da587d5968ec4f785e38570902fd24e0b522b46cb171872d1ea038e88328e7d973ff47d9392f72b2d49566209eb88eb60aed8534a965cf30072c39565bd8d72f68ac",
								"device": {},
								"geo": {}
							}
						],
						"config": {
							"dev": {
								"mail": {
									"from": 'me@localhost.com',
									"transport": {
										"type": "smtp",
										"options": {
											'service': 'gmail',
											"auth": {
												'user': 'soajsnotifier@gmail.com',
												'pass': 'Supernova1985'
											}
										}
									}
								},
								"urac": {
									"hashIterations": 1024, //used by hasher
									"seedLength": 32, //used by hasher
									"link": {
										"addUser": "http://dashboard.soajs.org/#/setNewPassword",
										"changeEmail": "http://dashboard.soajs.org/#/changeEmail/validate",
										"forgotPassword": "http://dashboard.soajs.org/#/resetPassword",
										"join": "http://dashboard.soajs.org/#/join/validate"
									},
									"tokenExpiryTTL": 2 * 24 * 3600 * 1000,// token expiry limit in seconds
									"validateJoin": true, //true if registration needs validation
									"mail": { //urac mail options
										"join": {
											"subject": 'Welcome to SOAJS'
										},
										"forgotPassword": {
											"subject": 'Reset Your Password at SOAJS'
										},
										"addUser": {
											"subject": 'Account Created at SOAJS'
										},
										"changeUserStatus": {
											"subject": "Account Status changed at SOAJS",
											//use custom HTML
											"content": "<p>Dear <b>{{ username }}</b>, <br />The administrator update your account status to <b>{{ status }}</b> on {{ ts|date('F jS, Y') }}.<br /><br />Regards,<br/>SOAJS Team.</p>"
										},
										"changeEmail": {
											"subject": "Change Account Email at SOAJS"
										}
									}
								}
							}
						}
					}
				]
			},
			{
				"product": "TPROD",
				"package": "TPROD_BASIC",
				"appId": new ObjectId("30d2cb5fc04ce51e06000002"),
				"description": "this is a description for app for test tenant for test product and basic package, and with example03 in acl",
				"acl": {
					"urac": {},
					"example03": {
						"access": true
					}
				},
				"_TTL": 86400000, // 24 hours
				"keys": [
					{
						"key": "695d3456de70fddc9e1e60a6d85b97d3",
						"extKeys": [
							{
								"expDate": new Date().getTime() + 86400000,
								"extKey": "aa39b5490c4a4ed0e56d7ec1232a428f7ad78ebb7347db3fc9875cb10c2bce39bbf8aabacf9e00420afb580b15698c04ce10d659d1972ebc53e76b6bbae0c113bee1e23062800bc830e4c329ca913fefebd1f1222295cf2eb5486224044b4d0c",
								"device": {"allow": [{"family": "chrome", 'major': '41', 'minor': '0', 'patch': {'min': '2222', 'max': '2229'}}], "deny": [{'family': 'IE'}]},
								"geo": {"allow": ["127.0.0.1", "localhost"], "deny": ['121.5.6.7']}
							}
						],
						"config": {
							"dev":{
								"urac": {}
							}
						}
					},
					{
						"key": "3d8443e0d100c24f2246926ae67fed22",
						"extKeys": [
							{
								"expDate": new Date().getTime() + 86400000,
								"extKey": "fa0a469b4d067ee9840c429bf5c68c33e9e0c0ca3c024c1cd6b140675c7983960509cc8fe79c30d0a81e45e0003d300cb41500682b00c7efd56965dd653b5755e688d22907a6ef46cf3f16510ae3134708c33b3094a757ca15f7ef08b1a7cbf4",
								"device": {},
								"geo": {}
							},
							{
								"expDate": new Date().getTime() + (86400000 * 2),
								"extKey": "fa0a469b4d067ee9840c429bf5c68c335d900d114b873f66491588af46c5d673a3fc0c2ff6df6bacecc578c14e3a861f27c429b3015eb76d834fbcaf25a7f79ebe58a11c5a6bf0732da3b507f81ca7535b1d6b1d3bee42363589764ac3c9e459",
								"device": {},
								"geo": {}
							}
						],
						"config": {
							"dev":{
								"urac": {}
							}
						}
					}
				]
			},
			{
				"product": "TPROD",
				"package": "TPROD_EXAMPLE03",
				"appId": new ObjectId("30d2cb5fc04ce51e06000003"),
				"description": "this is a description for app for test tenant for test product and example03 package",
				"_TTL": 86400000, // 24 hours
				"keys": [
					{
						"key": "ff7b65bb252201121f1be95adc08f44a",
						"extKeys": [
							{
								"expDate": new Date().getTime() + 86400000,
								"extKey": "aa39b5490c4a4ed0e56d7ec1232a428f1c5b5dcabc0788ce563402e233386738fc3eb18234a486ce1667cf70bd0e8b08890a86126cf1aa8d38f84606d8a6346359a61678428343e01319e0b784bc7e2ca267bbaafccffcb6174206e8c83f2a25",
								"device": {},
								"geo": {}
							}
						],
						"config": {
							"dev": {
								"urac": {}
							}
						}
					}
				]
			}
		]
	});
};