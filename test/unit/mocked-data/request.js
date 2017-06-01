var request1 = {
	soajs: {
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
				example06: [Object]
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
		awareness: {getHost: {}},
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
	headers: {}
};

module.exports = {
	request1: request1
};