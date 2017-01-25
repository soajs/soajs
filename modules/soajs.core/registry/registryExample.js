var regExample = {
    timeLoaded: 1485359061958,
    name: 'dashboard',
    environment: 'dashboard',
    profileOnly: false,
    coreDB: {
        provision: {
            name: 'core_provision',
            prefix: '',
            servers: [Object],
            credentials: null,
            streaming: [Object],
            URLParam: [Object],
            extraParam: [Object],
            registryLocation: [Object],
            timeConnected: 1485359061988
        },
        es: {
            prefix: '',
            servers: [Object],
            credentials: null,
            streaming: undefined,
            URLParam: [Object],
            extraParam: [Object],
            registryLocation: [Object],
            name: 'es'
        },
        session: {
            name: 'core_session',
            prefix: '',
            servers: [Object],
            credentials: null,
            URLParam: [Object],
            extraParam: [Object],
            store: {},
            collection: 'sessions',
            stringify: false,
            expireAfter: 1209600000,
            registryLocation: [Object]
        }
    },
    tenantMetaDB: {
        urac: {
            prefix: '',
            servers: [Object],
            credentials: null,
            streaming: undefined,
            URLParam: [Object],
            extraParam: [Object],
            name: '#TENANT_NAME#_urac'
        },
        news: {
            prefix: '',
            servers: [Object],
            credentials: null,
            streaming: undefined,
            URLParam: [Object],
            extraParam: [Object],
            name: '#TENANT_NAME#_news'
        }
    },
    serviceConfig: {
        awareness: {
            healthCheckInterval: 500,
            autoRelaodRegistry: 300000,
            maxLogCount: 5,
            autoRegisterService: true
        },
        agent: {topologyDir: '/opt/soajs/'},
        key: {algorithm: 'aes256', password: 'soajs key lal massa'},
        logger: {src: true, level: 'debug', formatter: [Object]},
        cors: {
            enabled: true,
            origin: '*',
            credentials: 'true',
            methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
            headers: 'key,soajsauth,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type',
            maxage: 1728000
        },
        oauth: {grants: [Object], debug: false},
        ports: {controller: 4000, maintenanceInc: 1000, randomInc: 100},
        cookie: {secret: 'this is a secret sentence'},
        session: {
            name: 'soajsID',
            secret: 'this is antoine hage app server',
            cookie: [Object],
            resave: false,
            saveUninitialized: false
        }
    },
    custom: {},
    services: {
        controller: {
            group: 'controller',
            maxPoolSize: 100,
            authorization: true,
            port: 4000,
            requestTimeout: 30,
            requestTimeoutRenewal: null,
            hosts: [Object],
            newServiceOrHost: true
        },
        urac: {
            group: 'service',
            port: 4001,
            versions: [Object],
            requestTimeoutRenewal: null,
            requestTimeout: null,
            version: 1,
            extKeyRequired: true,
            awareness: false
        },
        oauth: {
            group: 'service',
            port: 4002,
            versions: [Object],
            requestTimeoutRenewal: null,
            requestTimeout: null,
            version: 1,
            extKeyRequired: true,
            awareness: false
        },
        example01: {
            group: 'service',
            port: 4010,
            versions: [Object],
            requestTimeoutRenewal: null,
            requestTimeout: null,
            version: 1,
            extKeyRequired: false,
            awareness: false
        },
        example02: {
            group: 'service',
            port: 4011,
            versions: [Object],
            requestTimeoutRenewal: null,
            requestTimeout: null,
            version: 1,
            extKeyRequired: true,
            awareness: false
        },
        example06: {
            group: 'service',
            port: 4018,
            versions: [Object],
            requestTimeoutRenewal: null,
            requestTimeout: null,
            version: 1,
            extKeyRequired: true,
            awareness: false
        },
        helloworld: {
            group: 'No Group Service',
            port: 4020,
            versions: [Object],
            requestTimeoutRenewal: null,
            requestTimeout: null,
            version: 1,
            extKeyRequired: false,
            awareness: true
        },
        example03: {
            group: 'exampleGroup',
            port: 4012,
            versions: [Object],
            requestTimeoutRenewal: 2,
            requestTimeout: 2,
            version: 1,
            extKeyRequired: true,
            awareness: true
        }
    },
    daemons: {
        helloDaemon: {group: 'No Group Daemon', port: 4200, versions: [Object]},
        helloDaemonCron: {group: 'No Group Daemon', port: 4201, versions: [Object]}
    }
};
