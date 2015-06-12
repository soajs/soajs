'use strict';
var core = require("../soajs.core");
var Mongo = require("../soajs.mongo");
var async = require("async");
var mongo;

var config = require("./config");
function generateError(errorCode) {
	var error = new Error();
	error.code = errorCode;
	error.message = config.errors[errorCode];
	return error;
}

function ContentBuilder(config, callback) {

	if(!config.name) {
		return callback(generateError(190));
	}

	if(!config.version || typeof(config.version) !== 'number') {
		return callback(generateError(191));
	}

	core.registry.profile(function(registry) {
		if(!registry) {
			return callback(generateError(192));
		}

		//connect to mongo
		mongo = new Mongo(registry.coreDB.provision);

		//get the gc schema
		mongo.findOne("gc", {"name": config.name, "v": config.version}, function(error, config) {
			if(error) { return callback(error); }

			mongo.find("hosts",{"name": config.name},function(error, hosts){
				if(error){ return callback(error); }

				config.hosts = hosts;

				var envs = Object.keys(config.soajsService.db.config);
				async.mapLimit(envs, envs.length, addDbinEnv, function(error) {
					if(error){ return callback(error); }
					return callback(null, config);
				});
			});

			function addDbinEnv(envCode, cb) {
				var dbName = Object.keys(config.soajsService.db.config[envCode])[0];
				var updateOptions = {
					'$set': {}
				};
				updateOptions['$set']["dbs.databases." + dbName] = config.soajsService.db.config[envCode][dbName];
				mongo.update("environment", {"code": envCode}, updateOptions, {"safe": true}, cb);
			}
		});

	});
}

module.exports = ContentBuilder;