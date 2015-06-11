'use strict';
var core = require("../soajs.core");
var Mongo = require("../soajs.mongo");
var mongo;

var config = require("./config");
function generateError(errorCode) {
	var error = new Error();
	error.code = errorCode;
	error.message = config.errors[errorCode];
	return error;
}

function ContentBuilder(config, callback) {

	if(!config.name){
		return callback(generateError(190));
	}

	if(!config.version || typeof(config.version) !== 'number'){
		return callback(generateError(191));
	}

	core.registry.profile(function(registry) {
		if(!registry) {
			return callback(generateError(192));
		}

		//connect to mongo
		mongo = new Mongo(registry.coreDB.provision);

		//get the gc schema
		mongo.findOne("gc", {"name": config.name, "v": config.version}, callback);
	});
}

module.exports = ContentBuilder;