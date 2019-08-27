'use strict';
let async = require("async");
let _ = require("lodash");

module.exports = {
    "mergeACLArray": function (arrayACL, cb) {
	
	    //if only one return it
	    if (arrayACL.length === 1){
		    return cb(null, arrayACL[0]);
	    }
	    let acl = {};
	    async.parallel({
			    acl: function (callback) {
				    async.each(arrayACL, mergePackageAcl, callback);
			    },
			    acl_all_env: function (callback) {
				    async.each(arrayACL, mergePackageAclAllEnv, callback);
			    }
		    },
		    function () {
			    return cb(null, acl);
		    });
	
	    function mergePackageAcl(oneAcl, cb) {
		    //first object
		    if (!acl.acl) {
			    acl.acl = oneAcl.acl;
			    return cb();
		    }
		    async.eachOf(oneAcl.acl, function (service, serviceName, serviceCall) {
			    if (!acl.acl[serviceName]) {
				    acl.acl[serviceName] = service;
				    return serviceCall();
			    }
			    async.eachOf(service, function (version, versionValue, versionCall) {
				    if (!acl.acl[serviceName][versionValue]) {
					    acl.acl[serviceName][versionValue] = version;
					    return serviceCall();
				    }
				    if (version.apisPermission === "restricted") {
					    if (acl.acl[serviceName] && acl.acl[serviceName][versionValue] && acl.acl[serviceName][versionValue].apisPermission && acl.acl[serviceName][versionValue].apisPermission === "restricted") {
						    //only restricted allowed to merge
						    acl.acl[serviceName][versionValue] = _.merge(acl.acl[serviceName][versionValue], version);
						    return versionCall();
					    } else {
						    acl.acl[serviceName][versionValue] = version;
						    return versionCall();
					    }
				    } else {
					    //keep the old
					    if (acl.acl[serviceName] && acl.acl[serviceName][versionValue] && acl.acl[serviceName][versionValue].apisPermission && acl.acl[serviceName][versionValue].apisPermission === "restricted") {
						    return versionCall();
					    } else {
						    //only non restricted allowed to merge
						    acl.acl[serviceName][versionValue] = _.merge(acl.acl[serviceName][versionValue], version);
						    return versionCall();
					    }
				    }
			    }, serviceCall);
		    }, cb);
	    }
	
	    function mergePackageAclAllEnv(oneAcl, cb) {
		    //first object
		    if (!acl.acl_all_env) {
			    acl.acl_all_env = oneAcl.acl_all_env;
			    return cb();
		    }
		    async.eachOf(oneAcl.acl_all_env, function (environment, envName, envCall) {
			    if (!acl.acl_all_env[envName]) {
				    acl.acl_all_env[envName] = environment;
				    return envCall();
			    }
			    async.eachOf(environment, function (service, serviceName, serviceCall) {
				    if (!acl.acl_all_env[envName][serviceName]) {
					    acl.acl_all_env[envName][serviceName] = service;
					    return serviceCall();
				    }
				    async.eachOf(service, function (version, versionValue, versionCall) {
					    if (!acl.acl_all_env[envName][serviceName][versionValue]) {
						    acl.acl_all_env[envName][serviceName][versionValue] = version;
						    return serviceCall();
					    }
					    if (version.apisPermission === "restricted") {
						    if (acl.acl_all_env[envName][serviceName][versionValue].apisPermission && acl.acl_all_env[envName][serviceName][versionValue].apisPermission === "restricted") {
							    //only restricted allowed to merge
							    acl.acl_all_env[envName][serviceName][versionValue] = _.merge(acl.acl_all_env[envName][serviceName][versionValue], version);
							    return versionCall();
						    } else {
							    acl.acl_all_env[envName][serviceName][versionValue] = version;
							    return versionCall();
						    }
					    } else {
						    //keep the old
						    if (acl.acl_all_env[envName][serviceName][versionValue].apisPermission && acl.acl_all_env[envName][serviceName][versionValue].apisPermission === "restricted") {
							    return versionCall();
						    } else {
							    //only non restricted allowed to merge
							    acl.acl_all_env[envName][serviceName][versionValue] = _.merge(acl.acl_all_env[envName][serviceName][versionValue], version);
							    return versionCall();
						    }
					    }
				    }, serviceCall);
			    }, envCall);
		    }, cb);
	    }
    }
};