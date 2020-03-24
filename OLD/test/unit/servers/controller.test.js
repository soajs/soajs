"use strict";
var assert = require("assert");
var helper = require("../../helper.js");

const sinon = require('sinon');
var awareness_mw = helper.requireModule('./mw/awareness/index');
var coreModules = require("soajs.core.modules");
var http = require('http');
var httpProxy = require('http-proxy');

describe("Testing Controller", function () {

    let awarenessMwStub;
    let coreModulesStub;
    let httpStub;
    let httpProxyCreateProxyServerStub;
    let coreModulesStubLoadByEnv;
    let registerStub;
    let reloadStub;
    let coreModulesCoreStub;

    var SOAJS_SRVIP;
    var SOAJS_DEPLOY_HA;
    var SOAJS_ENV;
    var SOAJS_SRV_AUTOREGISTERHOST;

    // store env variables
    before(function (done) {
        // SOAJS_SRVIP = process.env.SOAJS_SRVIP;
        // SOAJS_DEPLOY_HA = process.env.SOAJS_DEPLOY_HA;
        SOAJS_ENV = process.env.SOAJS_ENV;
        // SOAJS_SRV_AUTOREGISTERHOST = process.env.SOAJS_SRV_AUTOREGISTERHOST;

        done();
    });

    // re store env variables
    after(function (done) {
        if (SOAJS_SRVIP) {
            process.env.SOAJS_SRVIP = SOAJS_SRVIP;
        } else {
            delete process.env.SOAJS_SRVIP;
        }
        if (SOAJS_DEPLOY_HA) {
            process.env.SOAJS_DEPLOY_HA = SOAJS_DEPLOY_HA;
        } else {
            delete process.env.SOAJS_DEPLOY_HA;
        }
        if (SOAJS_ENV) {
            process.env.SOAJS_ENV = SOAJS_ENV;
        } else {
            delete process.env.SOAJS_ENV;
        }
        if (SOAJS_SRV_AUTOREGISTERHOST) {
            process.env.SOAJS_SRV_AUTOREGISTERHOST = SOAJS_SRV_AUTOREGISTERHOST;
        } else {
            delete process.env.SOAJS_SRV_AUTOREGISTERHOST;
        }

        done();
    });

    afterEach(function (done) {
        if (awarenessMwStub) {
            awarenessMwStub.restore();
        }
        if (coreModulesStub) {
            coreModulesStub.restore();
        }
        if (httpStub) {
            httpStub.restore();
        }
        if (httpProxyCreateProxyServerStub) {
            httpProxyCreateProxyServerStub.restore();
        }
        if (coreModulesStubLoadByEnv) {
            coreModulesStubLoadByEnv.restore();
        }
        if (registerStub) {
            registerStub.restore();
        }
        if (reloadStub) {
            reloadStub.restore();
        }
        if (coreModulesCoreStub) {
            coreModulesCoreStub.restore();
        }
        done();
    });

    it("init - serviceIp ", function (done) {
        process.env.SOAJS_SRV_AUTOREGISTERHOST = "false";
        process.env.SOAJS_ENV = "dashboard"
        var controller = helper.requireModule('./servers/controller');
        controller = new controller();
        controller.init(function () {
            controller.stop(function () {
                done();
            });
        });
    });

    it("init - without serviceIp, with SOAJS_DEPLOY_HA, awarenessStat", function (done) {
        delete process.env.SOAJS_SRVIP;
        process.env.SOAJS_DEPLOY_HA = false;
        process.env.SOAJS_ENV = "dashboard";

        var controller = helper.requireModule('./servers/controller');

        awarenessMwStub = sinon.stub(awareness_mw, 'getMw').callsFake((param) => {
                return function (req, res, next) {
                    next();
                };
            }
        );

        coreModulesStub = sinon.stub(coreModules.provision, 'loadProvision').callsFake((cb) => {
                return cb(false);
            }
        );
        coreModulesCoreStub = sinon.stub(coreModules.core, 'getHostIp').callsFake((cb) => {
                return cb({
                    result: false,
                    extra: {
                        ips: "1"
                    }
                });
            }
        );

        controller = new controller();
        controller.init(function () {
            done();
        });
    });

    it("init - without serviceIp, with SOAJS_DEPLOY_HA, awarenessStat", function (done) {
        delete process.env.SOAJS_SRVIP;
        process.env.SOAJS_DEPLOY_HA = false;
        process.env.SOAJS_ENV = "dashboard";

        var controller = helper.requireModule('./servers/controller');

        awarenessMwStub = sinon.stub(awareness_mw, 'getMw').callsFake((param) => {
                return function (req, res, next) {
                    next();
                };
            }
        );

        coreModulesStub = sinon.stub(coreModules.provision, 'loadProvision').callsFake((cb) => {
                return cb(true);
            }
        );
        coreModulesCoreStub = sinon.stub(coreModules.core, 'getHostIp').callsFake((cb) => {
                return cb({
                    result: true,
                    extra: {
                        swarmTask: 1
                    }
                });
            }
        );

        httpStub = sinon.stub(http, 'createServer').callsFake((cb) => {
                if (cb.route) { // createServer(app)
                    return {
                        close: function () {
                            return true;
                        }
                    };
                } else { // second call
                    let request = {
                        url: "/awarenessStat"
                    };
                    let response = {
                        writeHead: function () {
                            return true;
                        },
                        end: function () {
                            return true;
                        }
                    };
                    return cb(request, response);
                }
            }
        );

        controller = new controller();
        controller.init(function () {

            if (SOAJS_SRVIP) {
                process.env.SOAJS_SRVIP = SOAJS_SRVIP;
            } else {
                delete process.env.SOAJS_SRVIP;
            }
            if (SOAJS_DEPLOY_HA) {
                process.env.SOAJS_DEPLOY_HA = SOAJS_DEPLOY_HA;
            } else {
                delete process.env.SOAJS_DEPLOY_HA;
            }
            if (SOAJS_ENV) {
                process.env.SOAJS_ENV = SOAJS_ENV;
            } else {
                delete process.env.SOAJS_ENV;
            }

            done();
        });
    });

    it("init - proxySocket", function (done) {
        var controller = helper.requireModule('./servers/controller');

        awarenessMwStub = sinon.stub(awareness_mw, 'getMw').callsFake((param) => {
                return function (req, res, next) {
                    next();
                };
            }
        );

        coreModulesStub = sinon.stub(coreModules.provision, 'loadProvision').callsFake((cb) => {
                return cb(true);
            }
        );

        httpProxyCreateProxyServerStub = sinon.stub(httpProxy, 'createProxyServer').callsFake((cb) => {
            return {
                on: function () {

                },
                web: function () {

                }
            };
        });

        httpStub = sinon.stub(http, 'createServer').callsFake((cb) => {
                if (cb.route) { // createServer(app)
                    return {
                        close: function () {
                            return true;
                        }
                    };
                } else { // second call
                    let request = {
                        url: "/proxySocket/.*",
                        headers: {},
                        on: function () {
                            return true;
                        },
                        pipe: function () {
                            return true;
                        }
                    };
                    let response = {
                        writeHead: function () {
                            return true;
                        },
                        end: function () {
                            return true;
                        }
                    };
                    return cb(request, response);
                }
            }
        );

        controller = new controller();
        controller.init(function () {
            done();
        });
    });

    it("init - getRegistry error", function (done) {
        var controller = helper.requireModule('./servers/controller');

        awarenessMwStub = sinon.stub(awareness_mw, 'getMw').callsFake((param) => {
                return function (req, res, next) {
                    req.soajs.awareness = {
                        "getHost": (s, cb) => {
                            cb("127.0.0.1");
                        }
                    };
                    next();
                };
            }
        );

        coreModulesStubLoadByEnv = sinon.stub(coreModules.core.registry, 'loadByEnv').callsFake((obj, cb) => {
                return cb({code: 2, message: "erreur"});
            }
        );

        httpStub = sinon.stub(http, 'createServer').callsFake((cb) => {
                if (cb.route) { // createServer(app)
                    return {
                        close: function () {
                            return true;
                        }
                    };
                } else { // second call
                    let request = {
                        url: "/getRegistry",
                        headers: {},
                        on: function () {
                            return true;
                        },
                        pipe: function () {
                            return true;
                        }
                    };
                    let response = {
                        writeHead: function () {
                            return true;
                        },
                        end: function () {
                            return true;
                        }
                    };
                    return cb(request, response);
                }
            }
        );

        controller = new controller();
        controller.init(function () {
            done();
        });
    });

    it("init - getRegistry success", function (done) {
        var controller = helper.requireModule('./servers/controller');

        awarenessMwStub = sinon.stub(awareness_mw, 'getMw').callsFake((param) => {
                return function (req, res, next) {
                    req.soajs.awareness = {
                        "getHost": (s, cb) => {
                            cb("127.0.0.1");
                        }
                    };
                    next();
                };
            }
        );

        coreModulesStubLoadByEnv = sinon.stub(coreModules.core.registry, 'loadByEnv').callsFake((obj, cb) => {
                return cb(null, {});
            }
        );

        httpStub = sinon.stub(http, 'createServer').callsFake((cb) => {
                if (cb.route) { // createServer(app)
                    return {
                        close: function () {
                            return true;
                        }
                    };
                } else { // second call
                    let request = {
                        url: "/getRegistry",
                        headers: {},
                        on: function () {
                            return true;
                        },
                        pipe: function () {
                            return true;
                        }
                    };
                    let response = {
                        writeHead: function () {
                            return true;
                        },
                        end: function () {
                            return true;
                        }
                    };
                    return cb(request, response);
                }
            }
        );

        controller = new controller();
        controller.init(function () {
            done();
        });
    });

    it("init - reload registry", function (done) {
        var controller = helper.requireModule('./servers/controller');

        awarenessMwStub = sinon.stub(awareness_mw, 'getMw').callsFake((param) => {
                return function (req, res, next) {
                    next();
                };
            }
        );

        httpStub = sinon.stub(http, 'createServer').callsFake((cb) => {
                if (cb.route) { // createServer(app)
                    return {
                        close: function () {
                            return true;
                        }
                    };
                } else { // second call
                    let request = {
                        url: "/reloadRegistry",
                        headers: {},
                        on: function () {
                            return true;
                        },
                        pipe: function () {
                            return true;
                        }
                    };
                    let response = {
                        writeHead: function () {
                            return true;
                        },
                        end: function () {
                            return true;
                        }
                    };
                    return cb(request, response);
                }
            }
        );

        controller = new controller();
        controller.init(function () {
            done();
        });
    });

    it("init - register ", function (done) {
        var controller = helper.requireModule('./servers/controller');

        awarenessMwStub = sinon.stub(awareness_mw, 'getMw').callsFake((param) => {
                return function (req, res, next) {
                    next();
                };
            }
        );

        registerStub = sinon.stub(coreModules.core.registry, 'register').callsFake((obj, cb) => {
                return cb(null, {});
            }
        );

        reloadStub = sinon.stub(coreModules.core.registry, 'reload').callsFake((obj, cb) => {
                return cb(null, {});
            }
        );

        httpStub = sinon.stub(http, 'createServer').callsFake((cb) => {
                if (cb.route) { // createServer(app)
                    return {
                        close: function () {
                            return true;
                        }
                    };
                } else { // second call
                    let request = {
                        url: "/register",
                        headers: {},
                        on: function () {
                            return true;
                        },
                        pipe: function () {
                            return true;
                        }
                    };
                    let response = {
                        writeHead: function () {
                            return true;
                        },
                        end: function () {
                            return true;
                        }
                    };
                    return cb(request, response);
                }
            }
        );

        controller = new controller();
        controller.init(function () {
            done();
        });
    });
});