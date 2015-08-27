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
    this.mongoSkin = mongoSkin;
}

/**
 *
 * @param {String} collectionName
 * @param {Object} docs
 * @param {Function} cb
 * @returns {*}
 */
MongoDriver.prototype.insert = function(collectionName, docs, cb) {
	var self = this;
	var versioning = false;

	if(!collectionName || !docs) { return cb(generateError(191)); }

	if(arguments.length === 4) {
		versioning = arguments[2];
		cb = arguments[3];
	}

	connect(self, function(err) {
		if(err) { return cb(err); }
		if(versioning) {
			if(Array.isArray(docs)) {
				docs.forEach(function(oneDoc) {
					oneDoc.v = 1;
					oneDoc.ts = new Date().getTime();
				});
			}
			else {
				docs.v = 1;
				docs.ts = new Date().getTime();
			}
			self.db.collection(collectionName).insert(docs, {'safe': true}, cb);
		}
		else {
			self.db.collection(collectionName).insert(docs, {'safe': true}, cb);
		}
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
	var versioning = false;
	if(arguments.length === 4) {
		versioning = arguments[2];
		cb = arguments[3];
	}

	if(!collectionName || !docs) {
		return cb(generateError(191));
	}
	connect(self, function(err) {
		if(err) {
			return cb(err);
		}
		if(versioning && docs && docs._id) {
			MongoDriver.addVersionToRecords.call(self, collectionName, docs, function(error, versionedDocument) {
				if(error) { return cb(error); }

				docs.v = versionedDocument[0].v + 1;
				docs.ts = new Date().getTime();
				self.db.collection(collectionName).save(docs, cb);
			});
		}
		else {
			self.db.collection(collectionName).save(docs, cb);
		}
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
MongoDriver.prototype.update = function(/*collectionName, criteria, record, [options,] versioning, cb*/) {
	var collectionName = arguments[0]
		, criteria = arguments[1]
		, updateOptions = arguments[2]
		, extra = arguments[3]
		, versioning = arguments.length === 6 ? arguments[4] : arguments[3]
		, cb = arguments[arguments.length - 1];

	if(typeof(extra) === 'boolean') { extra = {'safe': true, 'multi': true, 'upsert': false}; }
	if(typeof(versioning) !== 'boolean') { versioning = false; }

	var self = this;

	if(!collectionName) { return cb(generateError(191)); }
	connect(self, function(err) {
		if(err) { return cb(err); }

		if(versioning) {
			self.findOne(collectionName, criteria, function(error, originalRecord) {
				if(error) { return cb(error); }

				if(!originalRecord && extra.upsert){
					updateOptions['$set'].v = 1;
					updateOptions['$set'].ts = new Date().getTime();
					self.db.collection(collectionName).update(criteria, updateOptions, extra, cb);
				}
				else{
					MongoDriver.addVersionToRecords.call(self, collectionName, originalRecord, function(error, versionedRecord) {
						if(error) { return cb(error); }

						if(!updateOptions['$inc']) {updateOptions['$inc'] = {};}
						updateOptions['$inc'].v = 1;

						if(!updateOptions['$set']) {updateOptions['$set'] = {};}
						updateOptions['$set'].ts = new Date().getTime();

						self.db.collection(collectionName).update(criteria, updateOptions, extra, cb);
					});
				}
			});
		}
		else {
			self.db.collection(collectionName).update(criteria, updateOptions, extra, cb);
		}
	});
};

/**
 * Inserts a new version of the record in collectionName_versioning
 * @param {String} collection
 * @param {Object} oneRecord
 * @param {Function} cb
 * @returns {*}
 */
MongoDriver.addVersionToRecords = function(collection, oneRecord, cb) {
	var self = this;
	if(!oneRecord) { return cb(generateError(192)); }

	this.findOne(collection, {'_id': oneRecord._id}, function(error, originalRecord) {
		if(error) { return cb(error); }
		if(!originalRecord) { return cb(generateError(193)); }

		originalRecord.v = originalRecord.v || 0;
		originalRecord.ts = new Date().getTime();
		originalRecord.refId = originalRecord._id;
		delete originalRecord._id;

		self.insert(collection + '_versioning', originalRecord, cb);
	});
};

/**
 * Removes all the version of a record
 * @param {String} collection
 * @param {ObjectId} recordId
 * @param {Function} cb
 * @returns {*}
 */
MongoDriver.prototype.clearVersions = function(collection, recordId, cb) {
	if(!collection) { return cb(generateError(191)); }
	this.remove(collection + '_versioning', {'refId': recordId}, cb);
};

/**
 * Returns all the version of a record, sorted by v value descending
 * @param {String} collection
 * @param {ObjectId} oneRecordId
 * @param {Function} cb
 * @returns {*}
 */
MongoDriver.prototype.getVersions = function(collection, oneRecordId, cb) {
	if(!collection) { return cb(generateError(191)); }
	this.find(collection + '_versioning', {'refId': oneRecordId}, cb);
};

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
 * Closes Mongo connection
 */
MongoDriver.prototype.closeDb = function() {
	var self = this;
	if(self.db) {
		self.db.close();
	}
};

MongoDriver.prototype.getMongoSkinDB = function(cb){
    function buildDB(obj, cb){
        var url = constructMongoLink(obj.config.name, obj.config.prefix, obj.config.servers, obj.config.URLParam, obj.config.credentials);
        if(!url) {
            return cb(generateError(190));
        }

        var db = mongoSkin.db(url, obj.config.extraParam);
        return cb(null, db);
    }

    buildDB(this, cb);
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
}

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

module.exports = MongoDriver;