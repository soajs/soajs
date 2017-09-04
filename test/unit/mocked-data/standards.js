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
	param: {bodyParser: false}
};

var configuration2 = {
	soajs: {
		param: {
			bodyParser: false
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
	"config": {}
};


module.exports = {
	configuration: configuration,
	configuration2: configuration2,
	getExternalKeyDataKeyObj: getExternalKeyDataKeyObj
};