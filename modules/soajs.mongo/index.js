'use strict';
var core = require("../soajs.core");
var mongoSkin = require('mongoskin');
var config = require('./config');

function generateError(errorCode) {
	var error = new Error();
	error.code = errorCode;
	error.message = config.errors[errorCode];
	return error;
}

/* CLASS MongoDriver
 *
 * {
 *  name : ""
 *  prefix : ""
 *  servers : [{host : "", port : ""} ...]
 *  credentials : {username : "", password : ""}
 *  URLParam : { }
 *  extraParam : {db : {}, server : {}, replSet : {}, mongos: {}}
 * }
 *
 * REF: http://mongodb.github.io/node-mongodb-native/driver-articles/mongoclient.html#mongoclient-connect
 */
function MongoDriver(config) {
	this.config = config;
	this.db = null;
	this.pending = false;
	this.ObjectId = mongoSkin.ObjectID;
}

/**
 * Creates an index on the specified field if the index does not already exist.
 *
 * @param {String} collectionName
 * @param {Object} keys
 * @param {Object} options
 * @param {Function} cb
 * @returns {*}
 */
MongoDriver.prototype.ensureIndex = function(collectionName, keys, options, cb) {
	var self = this;
	if(!collectionName) {
		return cb(generateError(191));
	}
	connect(self, function(err) {
		if(err) {
			return cb(err);
		}
		self.db.ensureIndex(collectionName, keys, options, cb);
	});
};

/**
 *
 * @param {String} collectionName
 * @param {Function} cb
 * @returns {*}
 */
MongoDriver.prototype.getCollection = function(collectionName, cb) {
	var self = this;
	if(!collectionName) {
		return cb(generateError(191));
	}
	connect(self, function(err) {
		if(err) {
			return cb(err);
		}
		self.db.collection(collectionName, {'safe': true}, cb);
	});
};

/**
 *
 * @param {String} collectionName
 * @param {Object} docs
 * @param {Function} cb
 * @returns {*}
 */
MongoDriver.prototype.insert = function(collectionName, docs, cb) {
	var self = this;
	if(!collectionName || !docs) {
		return cb(generateError(191));
	}
	connect(self, function(err) {
		if(err) {
			return cb(err);
		}
		self.db.collection(collectionName).insert(docs, {'safe': true}, cb);
	});
};

/**
 *
 * @param {String} collectionName
 * @param {Object} docs
 * @param {Function} cb
 * @returns {*}
 */
MongoDriver.prototype.save = function(collectionName, docs, cb) {
	var self = this;
	if(!collectionName || !docs) {
		return cb(generateError(191));
	}
	connect(self, function(err) {
		if(err) {
			return cb(err);
		}
		self.db.collection(collectionName).save(docs, cb);
	});
};

/**
 *
 * @type {Function}
 */
MongoDriver.prototype.find = MongoDriver.prototype.findFields = function() {
	var args = Array.prototype.slice.call(arguments)
		, collectionName = args.shift()
		, cb = args[args.length - 1]
		, self = this;
	args.pop();

	if(!collectionName) {
		return cb(generateError(191));
	}
	connect(self, function(err) {
		if(err) {
			return cb(err);
		}
		self.db.collection(collectionName).find.apply(self.db.collection(collectionName), args).toArray(cb);
	});
};

/**
 *
 * @returns {*}
 */
MongoDriver.prototype.findAndModify = function(/*collectionName, criteria, sort, updateOps, options, cb*/) {
	var args = Array.prototype.slice.call(arguments)
		, collectionName = args.shift()
		, cb = args[args.length - 1]
		, self = this;

	if(!collectionName) {
		return cb(generateError(191));
	}
	connect(self, function(err) {
		if(err) {
			return cb(err);
		}
		self.db.collection(collectionName).findAndModify.apply(self.db.collection(collectionName), args);
	});
};

/**
 *
 * @returns {*}
 */
MongoDriver.prototype.findAndRemove = function() {
	var args = Array.prototype.slice.call(arguments)
		, collectionName = args.shift()
		, cb = args[args.length - 1]
		, self = this;

	if(!collectionName) {
		return cb(generateError(191));
	}
	connect(self, function(err) {
		if(err) {
			return cb(err);
		}
		self.db.collection(collectionName).findAndRemove.apply(self.db.collection(collectionName), args);
	});
};

/**
 * Finds a single document based on the query or criteria
 *
 * @param {String} collectionName
 * @param {Object} criteria
 * @param {Object} fields
 * @param {Function} cb
 * @returns {*}
 */
MongoDriver.prototype.findOne = MongoDriver.prototype.findOneFields = function(/* collectionName, criteria, fields, callback */) {
	var args = Array.prototype.slice.call(arguments)
		, collectionName = args.shift()
		, cb = args[args.length - 1]
		, self = this;

	if(!collectionName) {
		return cb(generateError(191));
	}
	connect(self, function(err) {
		if(err) {
			return cb(err);
		}
		self.db.collection(collectionName).findOne.apply(self.db.collection(collectionName), args);
	});
};

/**
 * Drops the specified collection
 *
 * @param {String} collectionName
 * @param {Function} cb
 * @returns {*}
 */
MongoDriver.prototype.dropCollection = function(collectionName, cb) {
	var self = this;
	if(!collectionName) {
		return cb(generateError(191));
	}
	connect(self, function(err) {
		if(err) {
			return cb(err);
		}
		self.db.collection(collectionName).drop(cb);
	});
};

/**
 *
 * @param Function}  cb
 */
MongoDriver.prototype.dropDatabase = function(cb) {
	var self = this;
	connect(self, function(err) {
		if(err) {
			return cb(err);
		}
		self.db.dropDatabase(cb);
	});
};

/**
 * Counts the number of criteria matching documents in a collection
 *
 * @param {String} collectionName
 * @param {Object} criteria
 * @param {Function} cb
 * @returns {*}
 */
MongoDriver.prototype.count = function(collectionName, criteria, cb) {
	var self = this;
	if(!collectionName) {
		return cb(generateError(191));
	}
	connect(self, function(err) {
		if(err) {
			return cb(err);
		}
		self.db.collection(collectionName).count(criteria, cb);
	});
};

/**
 * Removes the objects matching the criteria from the specified collection
 *
 * @param {String} collectionName
 * @param {Object} criteria
 * @param {Function} cb
 * @returns {*}
 */
MongoDriver.prototype.remove = function(collectionName, criteria, cb) {
	var self = this;
	if(!criteria) {
		criteria = {};
	}

	if(!collectionName) {
		return cb(generateError(191));
	}
	connect(self, function(err) {
		if(err) {
			return cb(err);
		}
		self.db.collection(collectionName).remove(criteria, {'safe': true}, cb);
	});
};

/**
 * Updates documents based on the query or criteria and the fields to update
 *
 * @param {String} collectionName
 * @param {Object} criteria
 * @param {Object} record
 * @param {Object} options
 * @param {Function} cb
 * @returns {*}
 */
MongoDriver.prototype.update = function(/*collectionName, criteria, record, [options,] cb*/) {
	var collectionName = arguments[0]
		, criteria = arguments[1]
		, updateOptions = arguments[2]
		, options = arguments.length === 5 ? arguments[3] : {'safe': true, 'multi': true, 'upsert': false}
		, cb = arguments[arguments.length - 1];
	var self = this;


	if(!collectionName) {
		return cb(generateError(191));
	}
	connect(self, function(err) {
		if(err) {
			return cb(err);
		}
		self.db.collection(collectionName).update(criteria, updateOptions, options, cb);
	});
};

/**
 * Ensure a connection to mongo without any race condition problem
 *
 * @param {Object} obj
 * @param {Function} cb
 * @returns {*}
 */
function connect(obj, cb) {
	if(obj.db) {
		return cb();
	}
	if(obj.pending) {
		return setImmediate(function() {
			connect(obj, cb);
		});
	}
	obj.pending = true;

	var url = constructMongoLink(obj.config.name, obj.config.prefix, obj.config.servers, obj.config.URLParam, obj.config.credentials);
	if(!url) {
		return cb(generateError(190));
	}

	mongoSkin.connect(url, obj.config.extraParam, function(err, db) {
		if(err) {
			obj.pending = false;
			return cb(err);
		} else {
			obj.db = db;
			obj.pending = false;
			return cb();
		}
	});

    /**
     *constructMongoLink: is a function that takes the below param and return the URL need to by mongoskin.connect
     *
     * @param dbName
     * @param prefix
     * @param servers
     * @param params
     * @param credentials
     * @returns {*}
     */
	function constructMongoLink(dbName, prefix, servers, params, credentials) {
		if(dbName && Array.isArray(servers)) {
			var url = "mongodb://";
			if(credentials && Object.hasOwnProperty.call(credentials, 'username') && credentials.hasOwnProperty.call(credentials, 'password')) {
				url = url.concat(credentials.username, ':', credentials.password, '@');
			}

			servers.forEach(function(element, index, array) {
				url = url.concat(element.host, ':', element.port, (index === array.length - 1 ? '' : ','));
			});

			url = url.concat('/');
			if(prefix) url = url.concat(prefix);
			url = url.concat(dbName);

			if(params && 'object' === typeof params && Object.keys(params).length) {
				url = url.concat('?');
				for(var i = 0; i < Object.keys(params).length; i++) {
					url = url.concat(Object.keys(params)[i], '=', params[Object.keys(params)[i]], i === Object.keys(params).length - 1 ? '' : "&");
				}
			}
			return url;
		}
		return null;
	}
}

module.exports = MongoDriver;