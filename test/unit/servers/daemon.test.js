"use strict";
var assert = require("assert");
var helper = require("../../helper.js");

const sinon = require('sinon');
var coreModules = require("soajs.core.modules");
var lib = require("soajs.core.libs");
var awareness_mw = helper.requireModule('./mw/awarenessEnv/index');

describe("Testing Daemon", function () {
	
	let awarenessMwStub;
	let coreModulesCoreStub;
	let loadProvisionStub;
	let loadDaemonGrpConfStub;
	let coreRegistryLoadStub;
	let coreRegistryGet;
	let autoRegisterServiceStub;
	let registerHostStub;
	let coreLoggerStub;
	let getDaemonServiceConfStub;
	let getExternalKeyDataStub;
	let getPackageDataStub;
	
	before(function (done) {
		done();
	});
	
	after(function (done) {
		// delete process.env.SOAJS_DAEMON_GRP_CONF;
		done();
	});
	
	afterEach(function (done) {
		if (awarenessMwStub) {
			awarenessMwStub.restore();
		}
		if (coreModulesCoreStub) {
			coreModulesCoreStub.restore();
		}
		if (coreRegistryLoadStub) {
			coreRegistryLoadStub.restore();
		}
		if (autoRegisterServiceStub) {
			autoRegisterServiceStub.restore();
		}
		if (coreRegistryGet) {
			coreRegistryGet.restore();
		}
		if (loadProvisionStub) {
			loadProvisionStub.restore();
		}
		if (coreLoggerStub) {
			coreLoggerStub.restore();
		}
		if (getDaemonServiceConfStub) {
			getDaemonServiceConfStub.restore();
		}
		if (registerHostStub) {
			registerHostStub.restore();
		}
		if (loadDaemonGrpConfStub) {
			loadDaemonGrpConfStub.restore();
		}
		if (getExternalKeyDataStub) {
			getExternalKeyDataStub.restore();
		}
		if (getPackageDataStub) {
			getPackageDataStub.restore();
		}
		done();
	});
	
	it("init - host with results", function (done) {
		
		let param = {
			serviceName: "test",
			servicePort: 20
		};
		
		coreModulesCoreStub = sinon.stub(coreModules.core, 'getHostIp').callsFake ((cb) => {
				return cb(null, {
					result: true,
					extra: {
						ips: "1",
						swarmTask: "2"
					}
				});
			}
		);
		
		coreRegistryLoadStub = sinon.stub(coreModules.core.registry, 'load').callsFake ((obj, cb) => {
				let registry = {
					serviceConfig: {}
				};
				return cb(registry);
			}
		);
		
		coreLoggerStub = sinon.stub(coreModules.core, 'getLogger').callsFake ((serviceName, logger) => {
				return {
					info: function (msg) {
						console.log(msg);
					},
					error: function (msg) {
						console.log(msg);
					},
					warn: function (msg) {
						console.log(msg);
					}
				};
			}
		);
		
		var daemon = helper.requireModule('./servers/daemon');
		daemon = new daemon(param);
		daemon.init(function () {
			done();
		});
	});
	
	it("init - host without results", function (done) {
		
		let param = {
			serviceName: "test",
			servicePort: 20
		};
		
		coreModulesCoreStub = sinon.stub(coreModules.core, 'getHostIp').callsFake ((cb) => {
				return cb(null, {
					result: false,
					extra: {
						ips: "1",
						swarmTask: "2"
					}
				});
			}
		);
		
		coreRegistryLoadStub = sinon.stub(coreModules.core.registry, 'load').callsFake ((obj, cb) => {
				let registry = {
					serviceConfig: {}
				};
				return cb(registry);
			}
		);
		
		coreLoggerStub = sinon.stub(coreModules.core, 'getLogger').callsFake ((serviceName, logger) => {
				return {
					info: function (msg) {
						console.log(msg);
					},
					error: function (msg) {
						console.log(msg);
					},
					warn: function (msg) {
						console.log(msg);
					}
				};
			}
		);
		
		var daemon = helper.requireModule('./servers/daemon');
		daemon = new daemon(param);
		daemon.init(function () {
			done();
		});
	});
	
	it("init - without daemonServiceConf", function (done) {
		
		process.env.SOAJS_DAEMON_GRP_CONF = "group1"; // as set in grunt
		// if it failed later on, on any update affecting the daemon group conf, store and restore env variable
		
		let param = {
			serviceName: "test",
			servicePort: 20,
			awarenessEnv: true
		};
		
		coreModulesCoreStub = sinon.stub(coreModules.core, 'getHostIp').callsFake ((cb) => {
				return cb(null, {
					result: false,
					extra: {
						ips: "1",
						swarmTask: "2"
					}
				});
			}
		);
		
		coreRegistryLoadStub = sinon.stub(coreModules.core.registry, 'load').callsFake ((obj, cb) => {
				let registry = {
					serviceConfig: {}
				};
				return cb(registry);
			}
		);
		
		coreLoggerStub = sinon.stub(coreModules.core, 'getLogger').callsFake ((serviceName, logger) => {
				return {
					info: function (msg) {
						console.log(msg);
					},
					error: function (msg) {
						console.log(msg);
					},
					warn: function (msg) {
						console.log(msg);
					}
				};
			}
		);
		
		awarenessMwStub = sinon.stub(awareness_mw, 'getMw').callsFake ((param) => {
				return function (req, res, next) {
					next();
				};
			}
		);
		
		getDaemonServiceConfStub = sinon.stub(lib.registry, 'getDaemonServiceConf').callsFake (() => {
				return {
					info: {
						port: 80
					},
					_conf: {
						ports: {
							maintenanceInc: 1000
						}
					}
				};
			}
		);
		
		loadProvisionStub = sinon.stub(coreModules.provision, 'loadProvision').callsFake ((cb) => {
				return cb(true);
			}
		);
		
		loadDaemonGrpConfStub = sinon.stub(coreModules.provision, 'loadDaemonGrpConf').callsFake ((groupConf, serviceName, cb) => {
				let daemonConf = {
					processing: "sequential",
					status: "valid",
					jobs: {
						'x': {
							tenantExtKeys: [
								{}
							]
						}
					}
					,
					order: ['x']
				};
				return cb(null, daemonConf);
			}
		);
		
		autoRegisterServiceStub = sinon.stub(coreModules.core.registry, 'autoRegisterService').callsFake (() => {
				return {};
			}
		);
		
		getPackageDataStub = sinon.stub(coreModules.provision, 'getPackageData').callsFake ((pack,cb) => {
			let data = {};
			return cb(null,data);
			}
		);
		
		getExternalKeyDataStub = sinon.stub(coreModules.provision, 'getExternalKeyData').callsFake ((in1, in2, cb) => {
				let data = {
					application : {
						package : {
							
						}
					},
					tenant : {
						
					}
				};
				return cb(null, data);
			}
		);
		
		registerHostStub = sinon.stub(coreModules.core.registry, 'registerHost').callsFake (() => {
				return {};
			}
		);
		
		coreRegistryGet = sinon.stub(coreModules.core.registry, 'get').callsFake (() => {
				let registry = {
					serviceConfig: {},
					coreDB: {}
				};
				return registry;
			}
		);
		
		var daemon = helper.requireModule('./servers/daemon');
		daemon = new daemon(param);
		daemon.init(function () {
			daemon.job("x", function(){
				// job body
			});
			
			daemon.start(function () {
				
				var options = {
					uri: 'http://127.0.0.1:1080/reloadDaemonConf'
				};
				helper.requester('get', options, function (error, body) {
					assert.ifError(error);
					assert.ok(body);
					done();
				});
			});
		});
	});
});