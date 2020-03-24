"use strict";
var assert = require('assert');
var helper = require("../helper.js");

var uracDriver = helper.requireModule('./mw/mt/urac');

var core = require("soajs.core.modules/soajs.core/index.js");

var coreLogger = core.getLogger('testing', {
    "src": true,
    "level": "fatal",
    "formatter": {
        outputMode: 'short'
    }
});

var registry = {
    "timeLoaded": 1490264559018,
    "name": "dashboard",
    "environment": "dashboard",
    "profileOnly": true,
    "coreDB": {
        "provision": {
            "servers": [
                {
                    "host": "127.0.0.1",
                    "port": 27017
                }
            ],
            "credentials": null,
            "URLParam": {
                "poolSize": 2,
                "bufferMaxEntries": 0
            },
            "streaming": {},
            "name": "core_provision",
            "prefix": "",
            "timeConnected": 1490264559019
        },
        "session": {
            "name": "core_session",
            "prefix": "",
            "servers": [
                {
                    "host": "127.0.0.1",
                    "port": 27017
                }
            ],
            "credentials": {},
            "URLParam": {
                "poolSize": 2,
                "bufferMaxEntries": 0
            },
            "store": {},
            "collection": "sessions",
            "stringify": false,
            "expireAfter": 1209600000,
            "timeConnected": 1490264559151
        }
    },
    "tenantMetaDB": {
        "urac": {
            "prefix": "",
            "servers": [
                {
                    "host": "127.0.0.1",
                    "port": 27017
                }
            ],
            "credentials": {},
            "streaming": {},
            "URLParam": {
                "connectTimeoutMS": 0,
                "socketTimeoutMS": 0,
                "maxPoolSize": 5,
                "w": 1,
                "wtimeoutMS": 0,
                "slaveOk": true
            },
            "extraParam": {
                "db": {
                    "native_parser": true
                },
                "server": {
                    "auto_reconnect": true
                }
            },
            "name": "#TENANT_NAME#_urac"
        }
    },
    "serviceConfig": {
        "awareness": {
            "healthCheckInterval": 5000,
            "autoRelaodRegistry": 3600000,
            "maxLogCount": 5,
            "autoRegisterService": true
        },
        "agent": {
            "topologyDir": "/opt/soajs/"
        },
        "key": {
            "algorithm": "aes256",
            "password": "soajs key lal massa"
        },
        "logger": {
            "level": "fatal",
            "formatter": {
                "outputMode": "short"
            }
        },
        "cors": {
            "enabled": true,
            "origin": "*",
            "credentials": "true",
            "methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
            "headers": "key,soajsauth,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Authorization",
            "maxage": 1728000
        },
        "oauth": {
            "grants": [
                "password",
                "refresh_token"
            ],
            "debug": false,
            "accessTokenLifetime": 7200,
            "refreshTokenLifetime": 1209600
        },
        "ports": {
            "controller": 4000,
            "maintenanceInc": 1000,
            "randomInc": 100
        },
        "cookie": {
            "secret": "this is a secret sentence"
        },
        "session": {
            "name": "soajsID",
            "secret": "this is antoine hage app server",
            "cookie": {
                "path": "/",
                "httpOnly": true,
                "secure": false,
                "maxAge": null
            },
            "resave": false,
            "saveUninitialized": false,
            "rolling": false,
            "unset": "keep"
        }
    },
    "deployer": {
        "type": "manual",
        "selected": "manual"
    },
    "custom": {},
    "services": {
        "controller": {
            "group": "controller",
            "maxPoolSize": 100,
            "authorization": true,
            "port": 4000,
            "requestTimeout": 30,
            "requestTimeoutRenewal": null,
            "hosts": {
                "1": [
                    "127.0.0.1"
                ],
                "latest": 1
            },
            "awarenessStats": {
                "127.0.0.1": {
                    "lastCheck": 1490264564024,
                    "healthy": true,
                    "version": "1"
                }
            }
        }
    },
    "daemons": {}
};

describe("testing urac", function () {
    var globalUrac;
    var soajsReqObj = {
        inputmaskData: {},
        'log': coreLogger,
        'meta': core.meta,
        'registry': registry,
        'servicesConfig': {
            "oauth": {
                "loginMode": "urac"
            },
            "mail": {
                "from": "me@localhost.com",
                "transport": {
                    "type": "sendmail",
                    "options": {}
                }
            },
            "urac": {
                "hashIterations": 1024,
                "seedLength": 32,
                "link": {
                    "addUser": "http://dashboard.soajs.org/#/setNewPassword",
                    "changeEmail": "http://dashboard.soajs.org/#/changeEmail/validate",
                    "forgotPassword": "http://dashboard.soajs.org/#/resetPassword",
                    "join": "http://dashboard.soajs.org/#/join/validate"
                },
                "tokenExpiryTTL": 172800000
            }
        },
        'tenant': {
            id: '10d2cb5fc04ce51e06000001',
            code: 'test',
            key: {
                iKey: 'd1eaaf5fdc35c11119330a8a0273fee9',
                eKey: 'aa39b5490c4a4ed0e56d7ec1232a428f771e8bb83cfcee16de14f735d0f5da587d5968ec4f785e38570902fd24e0b522b46cb171872d1ea038e88328e7d973ff47d9392f72b2d49566209eb88eb60aed8534a965cf30072c39565bd8d72f68ac'
            },
            application: {
                product: 'TPROD',
                package: 'TPROD_BASIC',
                appId: '30d2cb5fc04ce51e06000001',
                acl: {
                    "urac": {},
                    "oauth": {},
                    "dashboard": {}
                },
                acl_all_env: {
                    "dashboard": {
                        "urac": {},
                        "oauth": {},
                        "dashboard": {}
                    }
                },
                package_acl: {
                    "urac": {}
                },
                package_acl_all_env: {
                    "dashboard": {
                        "urac": {}
                    }
                }
            },
            roaming: {
                tId: '10d2cb5fc04ce51e06000001',
                user: {
                    "_id": "5551f9abe179c39b760f7a1c",
                    "locked": true,
                    "username": "owner",
                    "firstName": "owner",
                    "lastName": "owner",
                    "email": "me@localhost.com",
                    "ts": 1490024215844,
                    "status": "active",
                    "profile": {},
                    "groups": [
                        "owner"
                    ],
                    "config": {
                        "packages": {},
                        "keys": {}
                    },
                    "tenant": {
                        "id": "10d2cb5fc04ce51e06000001",
                        "code": "test"
                    },
                    "groupsConfig": [
                        {
                            "_id": "58cff718423cbb6425df4e40",
                            "locked": true,
                            "code": "owner",
                            "name": "Owner Group",
                            "description": "this is the owner group that owns the dashboard",
                            "tenant": {
                                "id": "10d2cb5fc04ce51e06000001",
                                "code": "test"
                            }
                        }
                    ],
                    "loginMode": "urac",
                    "id": "5551f9abe179c39b760f7a1c",
                    "socialLogin": {
                        "strategy": "facebook",
                        "id": "100"
                    }
                },
                tenantMetaDB: {
                    "urac": {
                        "prefix": "",
                        "servers": [
                            {
                                "host": "127.0.0.1",
                                "port": 27017
                            }
                        ],
                        "credentials": {},
                        "streaming": {},
                        "URLParam": {
                            "poolSize": 2,
                            "bufferMaxEntries": 0
                        },
                        "name": "#TENANT_NAME#_urac"
                    }
                },
                code: 'test'
            }
        }
    };

    it("fail - testing init", function (done) {
        var opts = {
            soajs: soajsReqObj,
            oauth: {
                bearerToken: {
                    user: {
                        loginMode: 'oauth'
                    }
                }
            }
        };
        var urac = new uracDriver(opts);
        urac.init(function (error, response) {
            assert.ifError(error);
            assert.ok(response);
            var profile = urac.getProfile();
            assert.ok(profile);
            done();
        });
    });

    it("fail - testing init again", function (done) {
        var opts = {
            soajs: soajsReqObj,
            oauth: {
                bearerToken: {}
            }
        };
        var urac = new uracDriver(opts);
        urac.init(function (error) {
            assert.ok(error);
            done();
        });
    });

    it("success - testing init", function (done) {
        var opts = {
            soajs: soajsReqObj,
            oauth: {
                bearerToken: {
                    user: {
                        id: '5551f9abe179c39b760f7a1c',
                        loginMode: 'urac'
                    }
                }
            }
        };
        opts.soajs.inputmaskData.isOwner = true;
        opts.soajs.inputmaskData.tCode = 'test';
        var urac = new uracDriver(opts);
        urac.init(function (error, response) {
            assert.ifError(error);
            assert.ok(response);
            globalUrac = urac;
            done();
        });
    });

    it("success - testing getProfile", function (done) {
        var profile = globalUrac.getProfile();
        assert.ok(profile);
        done();
    });

    it("success - testing getProfile - ALL", function (done) {
        var profile = globalUrac.getProfile(true);
        assert.ok(profile);
        done();
    });

    it("success - testing getAcl null", function (done) {
        var acl = globalUrac.getAcl();
        assert.ok(!acl);
        done();
    });

    /*
    it("success - testing getAcl key override", function (done) {
        var opts = {
            soajs: soajsReqObj,
            oauth: {
                bearerToken: {
                    user: {
                        id: '5551f9abe179c39b760f7a1c',
                        loginMode: 'urac'
                    }
                }
            }
        };
        opts.soajs.inputmaskData.isOwner = true;
        opts.soajs.inputmaskData.tCode = 'test';
        var urac = new uracDriver(opts);
        urac.init(function (error, response) {
            assert.ifError(error);
            assert.ok(response);

            urac.userRecord.config = {
                keys: {
                    "d1eaaf5fdc35c11119330a8a0273fee9": {
                        acl: {
                            "urac": {},
                            "oauth": {},
                            "dashboard": {}
                        },
                        config: {
                            "name": "beaver"
                        }
                    }
                }
            };

            var acl = urac.getAcl();
            assert.ok(acl);

            var config = urac.getConfig();
            assert.ok(config);

            var groups = urac.getGroups();
            assert.ok(groups);
            done();
        });
    });

    it("success - testing getAcl package override", function (done) {
        var opts = {
            soajs: soajsReqObj,
            oauth: {
                bearerToken: {
                    user: {
                        id: '5551f9abe179c39b760f7a1c',
                        loginMode: 'urac'
                    }
                }
            }
        };
        opts.soajs.inputmaskData.isOwner = true;
        opts.soajs.inputmaskData.tCode = 'test';
        var urac = new uracDriver(opts);
        urac.init(function (error, response) {
            assert.ifError(error);
            assert.ok(response);

            urac.userRecord.config = {
                packages: {
                    "TPROD_BASIC": {
                        acl: {
                            "urac": {},
                            "oauth": {},
                            "dashboard": {}
                        }
                    }
                }
            };

            var acl = urac.getAcl();
            assert.ok(acl);
            done();
        });
    });

    it("success - testing getAcl group key override", function (done) {
        var opts = {
            soajs: soajsReqObj,
            oauth: {
                bearerToken: {
                    user: {
                        id: '5551f9abe179c39b760f7a1c',
                        loginMode: 'urac'
                    }
                }
            }
        };
        opts.soajs.inputmaskData.isOwner = true;
        opts.soajs.inputmaskData.tCode = 'test';
        var urac = new uracDriver(opts);
        urac.init(function (error, response) {
            assert.ifError(error);
            assert.ok(response);

            delete urac.userRecord.config;
            urac.userRecord.groupsConfig = {
                allowedPackages : {
                    "TPROD": {
                        "TPROD_BASIC": {
                            acl: {
                                "urac": {},
                                "oauth": {},
                                "dashboard": {}
                            }
                        }
                    }
                },
                keys: {
                    "d1eaaf5fdc35c11119330a8a0273fee9": {
                        acl: {
                            "urac": {},
                            "oauth": {},
                            "dashboard": {}
                        }
                    }
                }
            };
            var acl = urac.getAcl();
            assert.ok(acl);
            done();
        });
    });
    */
    it("success - testing getAcl group override", function (done) {
        var opts = {
            soajs: soajsReqObj,
            oauth: {
                bearerToken: {
                    user: {
                        id: '5551f9abe179c39b760f7a1c',
                        loginMode: 'urac'
                    }
                }
            }
        };
        opts.soajs.inputmaskData.isOwner = true;
        opts.soajs.inputmaskData.tCode = 'test';
        var urac = new uracDriver(opts);
        urac.init(function (error, response) {
            assert.ifError(error);
            assert.ok(response);

            delete urac.userRecord.config;
            urac.userRecord.groupsConfig = {
                allowedPackages: {
                    "TPROD": ["TPROD_BASIC"]
                }
            };
            urac.user_ACL = {
                "acl": {
                    "urac": {},
                    "oauth": {},
                    "dashboard": {}
                }
            };
            var acl = urac.getAcl();
            assert.ok(acl);
            done();
        });
    });

    it("testing getAclAllEnv - null", function (done) {
        var acl = globalUrac.getAclAllEnv();
        assert.ok(!acl);
        done();
    });
    /*
        it("success - testing getAclAllEnv key override", function (done) {
            var opts = {
                soajs: soajsReqObj,
                oauth: {
                    bearerToken: {
                        user: {
                            id: '5551f9abe179c39b760f7a1c',
                            loginMode: 'urac'
                        }
                    }
                }
            };
            opts.soajs.inputmaskData.isOwner = true;
            opts.soajs.inputmaskData.tCode = 'test';
            var urac = new uracDriver(opts);
            urac.init(function (error, response) {
                assert.ifError(error);
                assert.ok(response);

                urac.userRecord.config = {
                    keys: {
                        "d1eaaf5fdc35c11119330a8a0273fee9": {
                            acl_all_env: {
                                "urac": {},
                                "oauth": {},
                                "dashboard": {}
                            }
                        }
                    }
                };

                var acl = urac.getAclAllEnv();
                assert.ok(acl);
                done();
            });
        });

        it("success - testing getAclAllEnv package override", function (done) {
            var opts = {
                soajs: soajsReqObj,
                oauth: {
                    bearerToken: {
                        user: {
                            id: '5551f9abe179c39b760f7a1c',
                            loginMode: 'urac'
                        }
                    }
                }
            };
            opts.soajs.inputmaskData.isOwner = true;
            opts.soajs.inputmaskData.tCode = 'test';
            var urac = new uracDriver(opts);
            urac.init(function (error, response) {
                assert.ifError(error);
                assert.ok(response);

                urac.userRecord.config = {
                    packages: {
                        "TPROD_BASIC": {
                            acl_all_env: {
                                "urac": {},
                                "oauth": {},
                                "dashboard": {}
                            }
                        }
                    }
                };

                var acl = urac.getAclAllEnv();
                assert.ok(acl);
                done();
            });
        });

        it("success - testing getAclAllEnv groups key override", function (done) {
            var opts = {
                soajs: soajsReqObj,
                oauth: {
                    bearerToken: {
                        user: {
                            id: '5551f9abe179c39b760f7a1c',
                            loginMode: 'urac'
                        }
                    }
                }
            };
            opts.soajs.inputmaskData.isOwner = true;
            opts.soajs.inputmaskData.tCode = 'test';
            var urac = new uracDriver(opts);
            urac.init(function (error, response) {
                assert.ifError(error);
                assert.ok(response);

                delete urac.userRecord.config;
                urac.userRecord.groupsConfig = {
                    keys: {
                        "d1eaaf5fdc35c11119330a8a0273fee9": {
                            acl_all_env: {
                                "urac": {},
                                "oauth": {},
                                "dashboard": {}
                            }
                        }
                    }
                };

                var acl = urac.getAclAllEnv();
                assert.ok(acl);
                done();
            });
        });
    */
    it("success - testing getAclAllEnv groups override", function (done) {
        var opts = {
            soajs: soajsReqObj,
            oauth: {
                bearerToken: {
                    user: {
                        id: '5551f9abe179c39b760f7a1c',
                        loginMode: 'urac'
                    }
                }
            }
        };
        opts.soajs.inputmaskData.isOwner = true;
        opts.soajs.inputmaskData.tCode = 'test';
        var urac = new uracDriver(opts);
        urac.init(function (error, response) {
            assert.ifError(error);
            assert.ok(response);

            delete urac.userRecord.config;
            urac.userRecord.groupsConfig = {
                allowedPackages: {
                    "TPROD": ["TPROD_BASIC"]
                }
            };

            urac.user_ACL = {
                "acl_all_env": {
                    "urac": {},
                    "oauth": {},
                    "dashboard": {}
                }
            };

            var acl = urac.getAclAllEnv();
            assert.ok(acl);
            done();
        });
    });

    it("testing getConfig", function (done) {
        done();
    });

    it("testing getGroups", function (done) {
        done();
    });
});