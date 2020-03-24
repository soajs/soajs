var configuration = {
	soajs: {
		param: {bodyParser: false},
		oauthService: {
			name: 'oauth',
			tokenApi: '/token',
			authorizationApi: '/authorization'
		},
		oauth: function (req, res, next) {
			return next();
		}
	},
	app: {},
	param: {
		bodyParser: false
	}
};

var configuration2 = {
	soajs: {
		param: {
			bodyParser: false,
			serviceName : "testing"
		},
		oauthService: {
			name: 'oauth',
			tokenApi: '/token',
			authorizationApi: '/authorization'
		},
		oauth: function (req, res, next) {
			return next();
		}
	},
	app: {
		soajs : {
			param : {
				serviceName : 'test'
			}
		}
	},
	param: {
		bodyParser: false,
		session: false,
		uracDriver: true
	},
	controllerResponse : {
		
	}
};

var getExternalKeyDataKeyObj = {
	"key": "9ccfb3cdaf5f61cf0cff5c78215b2292",
	"extKey": "d44dfaaf1a3ba93adc6b3368816188f9481bf65ad90f23756391e85d754394e0ee45923e96286f55e60a98efe825af3ef9007121c7baaa49ec8ea3ac9159a4bfc56c87674c94625b36b468c75d58158e0c9df0b386d7f591fbf679eb611d02bf",
	"tenant": {
		"id": "5551aca9e179c39b760f7a1a",
		"code": "DBTN"
	},
	"application": {
		"product": "DSBRD",
		"package": "DSBRD_OWNER",
		"appId": "55cc56a3c3aca9179e5048e6",
		"acl": null,
		"acl_all_env": null
	},
	"device": null,
	"geo": null,
	"env": "DASHBOARD",
	"config": {}
};

var getTenantOauthObj = {
		//"type" : 0,
		//"disabled": 0,
		"loginMode": "oauth",
        "secret" : "shhh this is a secret",
        "redirectUri" : "",
        "grants" : [
            "password",
            "refresh_token"
        ]
};

var objectWithAclData = {
	keyObj : {
		application : {
			"product": "DSBRD",
			"package": "DSBRD_OWNER",
			"appId": "55cc56a3c3aca9179e5048e6",
			"acl": null,
			"acl_all_env": null,
			"package_acl": {
				"oauth": {
					"access": false
				},
				"kbprofile": {
					"access": false
				},
				"urac": {
					"access": false,
					"apisRegExp": [
						{
							"regExp": {},
							"access": true
						},
						{
							"regExp": {},
							"access": true
						},
						{
							"regExp": {},
							"access": [
								"owner"
							]
						}
					]
				},
				"dashboard": {
					"access": false
				},
				"shoppingcart": {
					"access": false,
					"apisPermission": "restricted",
					"apis": {
						"/dashboard/getCarts": {}
					}
				},
				"order": {
					"access": false,
					"apis": {}
				},
				"catalog": {
					"apisRegExp": [
						{
							"regExp": {}
						}
					],
					"get": {},
					"post": {},
					"put": {}
				},
				"knowledgebase": {
					"access": false,
					"apisPermission": "restricted",
					"apisRegExp": [
						{
							"regExp": {},
							"access": false
						},
						{
							"regExp": {},
							"access": false
						},
						{
							"regExp": {},
							"access": false
						},
						{
							"regExp": {},
							"access": false
						},
						{
							"regExp": {},
							"access": false
						},
						{
							"regExp": {},
							"access": false
						}
					]
				},
				"drivers": {
					"access": false,
					"apisPermission": "restricted",
					"apis": {
						"/loadDrivers": {},
						"/executeDriver": {},
						"/getDriverInfo": {}
					}
				}
			},
			"package_acl_all_env": {
				"oauth": {
					"access": false
				},
				"kbprofile": {
					"access": false
				},
				"urac": {
					"access": false,
					"apis": {
						"/account/getUser": {
							"access": true
						},
						"/account/changePassword": {
							"access": true
						},
						"/account/editProfile": {
							"access": true
						},
						"/account/changeEmail": {
							"access": true
						},
						"/login": {},
						"/passport/login/:strategy": {},
						"/passport/validate/:strategy": {},
						"/forgotPassword": {},
						"/changeEmail/validate": {},
						"/logout": {},
						"/resetPassword": {}
					}
				},
				"dashboard": {
					"access": false
				},
				"shoppingcart": {
					"access": false,
					"apisPermission": "restricted",
					"apis": {
						"/dashboard/getCarts": {}
					}
				},
				"order": {
					"access": false,
					"apis": {}
				},
				"catalog": {
					"apisRegExp": [
						{
							"regExp": {}
						}
					],
					"get": {},
					"post": {},
					"put": {}
				},
				"knowledgebase": {
					"access": false,
					"apisPermission": "restricted",
					"apisRegExp": [
						{
							"regExp": {},
							"access": false
						},
						{
							"regExp": {},
							"access": false
						},
						{
							"regExp": {},
							"access": false
						},
						{
							"regExp": {},
							"access": false
						},
						{
							"regExp": {},
							"access": false
						},
						{
							"regExp": {},
							"access": false
						}
					]
				},
				"drivers": {
					"access": false,
					"apisPermission": "restricted",
					"apis": {
						"/loadDrivers": {},
						"/executeDriver": {},
						"/getDriverInfo": {}
					}
				}
			}
		}
	},
	packObj : {
		acl : {
			"oauth": {
				"access": false
			},
			"kbprofile": {
				"access": false
			},
			"urac": {
				"access": false,
				"apis": {
					"/account/getUser": {
						"access": true
					},
					"/account/changePassword": {
						"access": true
					},
					"/account/editProfile": {
						"access": true
					},
					"/account/changeEmail": {
						"access": true
					},
					"/login": {},
					"/passport/login/:strategy": {},
					"/passport/validate/:strategy": {},
					"/forgotPassword": {},
					"/changeEmail/validate": {},
					"/logout": {},
					"/resetPassword": {}
				}
			},
			"dashboard": {
				"access": false
			},
			"shoppingcart": {
				"access": false,
				"apisPermission": "restricted",
				"apis": {
					"/dashboard/getCarts": {}
				}
			},
			"order": {
				"access": false,
				"apis": {}
			},
			"catalog": {
				"apisRegExp": [
					{
						"regExp": {}
					}
				],
				"get": {},
				"post": {},
				"put": {}
			},
			"test": {
				"access": false,
				"apisPermission": "restricted",
				"test": {
					"access": false,
					"apisPermission": "restricted",
					"apisRegExp": [
						{
							"regExp": {},
							"access": false
						},
						{
							"regExp": {},
							"access": false
						},
						{
							"regExp": {},
							"access": false
						},
						{
							"regExp": {},
							"access": false
						},
						{
							"regExp": {},
							"access": false
						},
						{
							"regExp": {},
							"access": false
						}
					],
					"apis": {
						"/loadDrivers": {},
						"/executeDriver": {},
						"/getDriverInfo": {}
					}
				}
			},
			"test2": {
				"access": false,
				"apisPermission": "restricted",
				"test2": {
					"access": false,
					"apis": {
						"/loadDrivers": {},
						"/executeDriver": {},
						"/getDriverInfo": {}
					}
				}
			},
			"drivers": {
				"access": false,
				"apisPermission": "restricted",
				"apis": {
					"/loadDrivers": {},
					"/executeDriver": {},
					"/getDriverInfo": {}
				}
			}
		}
	}
}

module.exports = {
	configuration,
	configuration2,
	getExternalKeyDataKeyObj,
    getTenantOauthObj,
	objectWithAclData
};