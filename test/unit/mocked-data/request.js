var request1 = {
	url: "http://127.0.0.1:4000/example/any",
	soajs: {
		meta: {
			tenantDB: function () {
				var response = {
					name: 'DBTN_urac',
					prefix: '',
					servers: [{host: '127.0.0.1', port: 27017}],
					credentials: null,
					streaming: null,
					URLParam: {
						connectTimeoutMS: 0,
						socketTimeoutMS: 0,
						native_parser: true,
						bufferMaxEntries: 0,
						autoReconnect: false
					},
					extraParam: {
						db: {native_parser: true, bufferMaxEntries: 0},
						server: {socketOptions: [Object]}
					}
				};
				return response;
			}
		},
		log: {
			domain: null,
			_events: {},
			_eventsCount: 0,
			_maxListeners: undefined,
			_level: 20,
			streams: [[Object]],
			serializers: null,
			src: true,
			fields: {
				name: 'controller',
				hostname: 'Etiennes-MacBook-Pro.local',
				pid: 17782
			},
			haveNonRawStreams: true,
			error: function (err) {
				console.log(err);
			},
			warn: function (err) {
				console.log(err)
			},
			debug: function (msg) {
				console.log(msg)
			}
		},
		registry: {
			timeLoaded: 1496242127195,
			name: 'dashboard',
			environment: 'dashboard',
			profileOnly: true,
			coreDB: {
				provision: [Object],
				esClient: [Object],
				commerce: [Object],
				catalog: [Object],
				knowledgebase: [Object],
				session: [Object]
			},
			tenantMetaDB: {urac: [Object]},
			serviceConfig: {
				awareness: [Object],
				agent: [Object],
				key: [Object],
				logger: [Object],
				cors: [Object],
				oauth: [Object],
				ports: [Object],
				cookie: [Object],
				session: [Object]
			},
			deployer: {type: 'manual', container: [Object], cloud: [Object]},
			custom: {},
			services: {
				controller: [Object],
				urac: [Object],
				dashboard: [Object],
				oauth: [Object],
				testjava: [Object],
				example06: [Object],
				testing : {
					extKeyRequired: true
				}
			},
			daemons: {
				catalogdaemon: [Object],
				orderDaemon: [Object],
				cleaner: [Object],
				merchantsCreator: [Object],
				migrator: [Object]
			}
		},
		buildResponse: [Function],
		controllerResponse: function () {
			return 1;
		},
		awareness: {
			getHost: function (input, cb) {
				var controllerHostInThisEnvironment = {};
				cb(controllerHostInThisEnvironment);
			}
		},
		awarenessEnv: {getHost: {}},
		controller: {
			serviceParams: {
				registry: {
					extKeyRequired: true,
					urac: false,
					urac_Profile: false,
					urac_ACL: false,
					provision_ACL: false,
					oauth: true,
					apis: [[Object], [Object], [Object], [Object], [Object], [Object]],
					versions: {
						"1": {
							extKeyRequired: true,
							urac: true,
							urac_Profile: true,
							urac_ACL: true,
							provision_ACL: false,
							oauth: true
						}
					}
				},
				name: 'dashboard',
				url: '/permissions/get?access_token=b0a42c96276c8abfc2e12e856178b3e336712924',
				version: 1,
				extKeyRequired: true,
				path: '/permissions/get',
				serviceInfo: ['dashboard', 'permissions', 'get'],
				parsedUrl: [Object]
			},
			gotoservice: {}
		},
		uracDriver: {
			getAcl: function () {
				return {};
			},
			getAclAllEnv: function () {
				return {};
			},
			getProfile: function () {
				var profile = {
					"_id": 1,
					"username": 'test',
					"firstName": 'test2',
					"lastName": 'daher',
					"email": 'test@test.test',
					"groups": null,
					"profile": "king",
					"tenant": {
						id: 123,
						code: "any"
					}
				};
				
				return profile;
			}
		}
	},
	get: function () {
		return 1;
	},
	headers: {
		"x-forwarded-proto": "http",
		"host": "dashboard-api.soajs.org",
		"x-nginx-proxy": "true",
		"content-length": "66",
		"accept": "*/*",
		"origin": "http://dashboard.soajs.org",
		"authorization": "Basic NTU1MWFjYTllMTc5YzM5Yjc2MGY3YTFhOnNoaGggdGhpcyBpcyBhIHNlY3JldA==",
		"key": "d44dfaaf1a3ba93adc6b3368816188f96134dfedec7072542eb3d84ec3e3d260f639954b8c0bc51e742c1dff3f80710e3e728edb004dce78d82d7ecd5e17e88c39fef78aa29aa2ed19ed0ca9011d75d9fc441a3c59845ebcf11f9393d5962549",
		"user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.101 Safari/537.36",
		"content-type": "application/json",
		"referer": "http://dashboard.soajs.org/",
		"accept-encoding": "gzip, deflate",
		"accept-language": "en-US,en;q=0.8,ar;q=0.6",
		"soajsinjectobj": "{\"tenant\":{\"id\":\"5551aca9e179c39b760f7a1a\",\"code\":\"DBTN\"},\"key\":{\"config\":{\"mail\":{\"from\":\"soajstest@soajs.org\",\"transport\":{\"type\":\"smtp\",\"options\":{\"host\":\"secure.emailsrvr.com\",\"port\":\"587\",\"ignoreTLS\":true,\"secure\":false,\"auth\":{\"user\":\"soajstest@soajs.org\",\"pass\":\"p@ssw0rd\"}}}},\"oauth\":{\"loginMode\":\"urac\"}},\"iKey\":\"38145c67717c73d3febd16df38abf311\",\"eKey\":\"d44dfaaf1a3ba93adc6b3368816188f96134dfedec7072542eb3d84ec3e3d260f639954b8c0bc51e742c1dff3f80710e3e728edb004dce78d82d7ecd5e17e88c39fef78aa29aa2ed19ed0ca9011d75d9fc441a3c59845ebcf11f9393d5962549\"},\"application\":{\"product\":\"DSBRD\",\"package\":\"DSBRD_MAIN\",\"appId\":\"5512926a7a1f0e2123f638de\"},\"package\":{},\"device\":\"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.101 Safari/537.36\",\"geo\":{\"ip\":\"127.0.0.1\"},\"awareness\":{\"host\":\"127.0.0.1\",\"port\":4000},\"urac\":{\"_id\": \"59a538becc083eecf37149df\", \"username\": \"owner\", \"firstName\": \"owner\", \"lastName\": \"owner\", \"email\": \"owner@soajs.org\", \"groups\": [ \"owner\" ], \"tenant\": { \"id\":\"5551aca9e179c39b760f7a1a\", \"code\": \"DBTN\" },\"profile\": {},\"acl\": null, \"acl_AllEnv\": null},\"param\":{\"id\":\"5551aca9e179c39b760f7a1a\"}}",
		"cookie": "",
		"connection": "close"
	},
	route: {
		path: "test/test"
	},
	session: {
		cookie: {
			path: '/',
			_expires: null,
			originalMaxAge: null,
			httpOnly: true,
			secure: false
		}
	}
};

module.exports = {
	request1: request1
};