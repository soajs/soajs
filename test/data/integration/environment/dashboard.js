'use strict';
let lib = {
	_id: "55128442e603d7e01ab1688c",
	code: "DASHBOARD",
	domain: "localhost",
	sitePrefix: "",
	apiPrefix: "",
	locked: true,
	port: 80,
	protocol: "http",
	profile: "/opt/soajs/FILES/profiles/profile.js",
	deployer: {
		type: "manual",
		selected: "manual",
		manual: {
			nodes: "127.0.0.1"
		},
		container: {
			docker: {
				local: {
					nodes: "",
					socketPath: "/var/run/docker.sock"
				},
				remote: {
					apiPort: "",
					nodes: "",
					apiProtocol: "",
					auth: {
						token: ""
					}
				}
			},
			kubernetes: {
				local: {
					nodes: "",
					apiPort: "",
					namespace: "",
					auth: {
						token: ""
					}
				},
				remote: {
					nodes: "",
					apiPort: "",
					namespace: "",
					auth: {
						token: ""
					}
				}
			}
		}
	},
	description: "SOAJS Console Environment",
	dbs: {
		config: {
			prefix: ""
		},
		databases: {
			urac: {
				cluster: "dash_cluster",
				tenantSpecific: true
			}
		}
	},
	services: {
		controller: {
			maxPoolSize: 100,
			authorization: true,
			requestTimeout: 30,
			requestTimeoutRenewal: 0
		},
		config: {
			awareness: {
				cacheTTL: 3600000,
				healthCheckInterval: 1000,
				autoRelaodRegistry: 3600000,
				maxLogCount: 5,
				autoRegisterService: true
			},
			agent: {
				topologyDir: "/opt/soajs/"
			},
			logger: {
				src: true,
				level: "debug",
				formatter: {
					levelInString: true,
					outputMode: "long"
				}
			},
			cors: {
				enabled: true,
				origin: "*",
				credentials: "true",
				methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
				headers: "__env,key,soajsauth,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Authorization",
				maxage: 1728000
			},
			oauth: {
				grants: [
					"password",
					"refresh_token"
				],
				debug: false,
				getUserFromToken: true,
				accessTokenLifetime: 7200,
				refreshTokenLifetime: 1209600
			},
			ports: {
				controller: 4000,
				maintenanceInc: 1000,
				randomInc: 100
			},
			cookie: {
				secret: "this is a secret sentence"
			},
			session: {
				name: "soajsID",
				secret: "this is antoine hage app server",
				cookie: {
					path: "/",
					httpOnly: true,
					secure: false,
					maxAge: null
				},
				resave: false,
				saveUninitialized: false,
				rolling: false,
				unset: "keep"
			},
			key: {
				algorithm: "aes256",
				password: "soajs key lal massa"
			}
		}
	},
	sensitive: null
};
module.exports = lib;

