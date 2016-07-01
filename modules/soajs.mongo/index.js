'use strict';
var core = require("../soajs.core");
var mongoSkin = require('mongoskin');
var merge = require('merge');
var objectHash = require("object-hash");
var config = require('./config');

var cacheDB = {};

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
function MongoDriver(dbConfig) {
    this.config = dbConfig;
    this.db = null;
    this.pending = false;
    this.ObjectId = mongoSkin.ObjectID;
    this.mongoSkin = mongoSkin;
    if (this.config && this.config.registryLocation && this.config.registryLocation.env && this.config.registryLocation.l1 && this.config.registryLocation.l2) {
        if (!cacheDB)
            cacheDB = {};
        if (!cacheDB[this.config.registryLocation.env])
            cacheDB[this.config.registryLocation.env] = {};
        if (!cacheDB[this.config.registryLocation.env][this.config.registryLocation.l1])
            cacheDB[this.config.registryLocation.env][this.config.registryLocation.l1] = {};
        if (!cacheDB[this.config.registryLocation.env][this.config.registryLocation.l1][this.config.registryLocation.l2])
            cacheDB[this.config.registryLocation.env][this.config.registryLocation.l1][this.config.registryLocation.l2] = {};
    }
}
/**
 *
 * @param {String} collectionName
 * @param {Object} docs
 * @param {Function} cb
 * @returns {*}
 */
MongoDriver.prototype.insert = function (collectionName, docs, cb) {
    var self = this;
    var versioning = false;

    if (!collectionName || !docs) {
        return cb(core.error.generate(191));
    }

    if (arguments.length === 4) {
        versioning = arguments[2];
        cb = arguments[3];
    }

    connect(self, function (err) {
        if (err) {
            return cb(err);
        }
        if (versioning) {
            if (Array.isArray(docs)) {
                docs.forEach(function (oneDoc) {
                    oneDoc.v = 1;
                    oneDoc.ts = new Date().getTime();
                });
            }
            else {
                docs.v = 1;
                docs.ts = new Date().getTime();
            }
            self.db.collection(collectionName).insert(docs, {'safe': true}, function (error, response) {
                if (error) {
                    return cb(error);
                }

                return cb(null, response.ops);
            });
        }
        else {
            self.db.collection(collectionName).insert(docs, {'safe': true}, function (error, response) {
                if (error) {
                    return cb(error);
                }

                return cb(null, response.ops);
            });
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
MongoDriver.prototype.save = function (collectionName, docs, cb) {
    var self = this;
    var versioning = false;
    if (arguments.length === 4) {
        versioning = arguments[2];
        cb = arguments[3];
    }

    if (!collectionName || !docs) {
        return cb(core.error.generate(191));
    }
    connect(self, function (err) {
        if (err) {
            return cb(err);
        }
        if (versioning && docs && docs._id) {
            MongoDriver.addVersionToRecords.call(self, collectionName, docs, function (error, versionedDocument) {
                if (error) {
                    return cb(error);
                }

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
MongoDriver.prototype.update = function (/*collectionName, criteria, record, [options,] versioning, cb*/) {
    var collectionName = arguments[0]
        , criteria = arguments[1]
        , updateOptions = arguments[2]
        , extra = arguments[3]
        , versioning = arguments.length === 6 ? arguments[4] : arguments[3]
        , cb = arguments[arguments.length - 1];

    if (typeof(extra) === 'boolean') {
        extra = {'safe': true, 'multi': true, 'upsert': false};
    }
    if (typeof(versioning) !== 'boolean') {
        versioning = false;
    }

    var self = this;

    if (!collectionName) {
        return cb(core.error.generate(191));
    }
    connect(self, function (err) {
        if (err) {
            return cb(err);
        }

        if (versioning) {
            self.findOne(collectionName, criteria, function (error, originalRecord) {
                if (error) {
                    return cb(error);
                }

                if (!originalRecord && extra.upsert) {
                    updateOptions['$set'].v = 1;
                    updateOptions['$set'].ts = new Date().getTime();
                    self.db.collection(collectionName).update(criteria, updateOptions, extra, function (error, response) {
                        if (error) {
                            return cb(error);
                        }
                        return cb(null, response.result.n);
                    });
                }
                else {
                    MongoDriver.addVersionToRecords.call(self, collectionName, originalRecord, function (error, versionedRecord) {
                        if (error) {
                            return cb(error);
                        }

                        if (!updateOptions['$inc']) {
                            updateOptions['$inc'] = {};
                        }
                        updateOptions['$inc'].v = 1;

                        if (!updateOptions['$set']) {
                            updateOptions['$set'] = {};
                        }
                        updateOptions['$set'].ts = new Date().getTime();

                        self.db.collection(collectionName).update(criteria, updateOptions, extra, function (error, response) {
                            if (error) {
                                return cb(error);
                            }
                            return cb(null, response.result.n);
                        });
                    });
                }
            });
        }
        else {
            self.db.collection(collectionName).update(criteria, updateOptions, extra, function (error, response) {
                if (error) {
                    return cb(error);
                }
                return cb(null, response.result.n);
            });
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
MongoDriver.addVersionToRecords = function (collection, oneRecord, cb) {
    var self = this;
    if (!oneRecord) {
        return cb(core.error.generate(192));
    }

    this.findOne(collection, {'_id': oneRecord._id}, function (error, originalRecord) {
        if (error) {
            return cb(error);
        }
        if (!originalRecord) {
            return cb(core.error.generate(193));
        }

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
MongoDriver.prototype.clearVersions = function (collection, recordId, cb) {
    if (!collection) {
        return cb(core.error.generate(191));
    }
    this.remove(collection + '_versioning', {'refId': recordId}, cb);
};

/**
 * Returns all the version of a record, sorted by v value descending
 * @param {String} collection
 * @param {ObjectId} oneRecordId
 * @param {Function} cb
 * @returns {*}
 */
MongoDriver.prototype.getVersions = function (collection, oneRecordId, cb) {
    if (!collection) {
        return cb(core.error.generate(191));
    }
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
MongoDriver.prototype.ensureIndex = function (collectionName, keys, options, cb) {
    var self = this;
    if (!collectionName) {
        return cb(core.error.generate(191));
    }
    connect(self, function (err) {
        if (err) {
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
MongoDriver.prototype.getCollection = function (collectionName, cb) {
    var self = this;
    if (!collectionName) {
        return cb(core.error.generate(191));
    }
    connect(self, function (err) {
        if (err) {
            return cb(err);
        }
        self.db.collection(collectionName, {'safe': true}, cb);
    });
};

/**
 *
 * @type {Function}
 */
MongoDriver.prototype.find = MongoDriver.prototype.findFields = function () {
    var args = Array.prototype.slice.call(arguments)
        , collectionName = args.shift()
        , cb = args[args.length - 1]
        , self = this;
    args.pop();

    if (!collectionName) {
        return cb(core.error.generate(191));
    }
    connect(self, function (err) {
        if (err) {
            return cb(err);
        }
        self.db.collection(collectionName).find.apply(self.db.collection(collectionName), args).toArray(cb);
    });
};

/**
 * Returns a stream for querying records.
 *
 * @method findStream
 * @param {String} collectionName
 * @param {Object} criteria
 * @param {Object} options
 * @param {Function} callback
 */
MongoDriver.prototype.findStream = MongoDriver.prototype.findFieldsStream = function () {
    var args = Array.prototype.slice.call(arguments)
        , collectionName = args.shift()
        , cb = args[args.length - 1]
        , self = this;
    args.pop();

    if (!collectionName) {
        return cb(core.error.generate(191));
    }
    connect(self, function (err) {
        if (err) {
            return cb(err);
        }
        return cb(null, self.db.collection(collectionName).find.apply(self.db.collection(collectionName), args).stream());
    });
};

/**
 *
 * @returns {*}
 */
MongoDriver.prototype.findAndModify = function (/*collectionName, criteria, sort, updateOps, options, cb*/) {
    var args = Array.prototype.slice.call(arguments)
        , collectionName = args.shift()
        , cb = args[args.length - 1]
        , self = this;

    if (!collectionName) {
        return cb(core.error.generate(191));
    }
    connect(self, function (err) {
        if (err) {
            return cb(err);
        }
        self.db.collection(collectionName).findAndModify.apply(self.db.collection(collectionName), args);
    });
};

/**
 *
 * @returns {*}
 */
MongoDriver.prototype.findAndRemove = function () {
    var args = Array.prototype.slice.call(arguments)
        , collectionName = args.shift()
        , cb = args[args.length - 1]
        , self = this;

    if (!collectionName) {
        return cb(core.error.generate(191));
    }
    connect(self, function (err) {
        if (err) {
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
MongoDriver.prototype.findOne = MongoDriver.prototype.findOneFields = function (/* collectionName, criteria, fields, callback */) {
    var args = Array.prototype.slice.call(arguments)
        , collectionName = args.shift()
        , cb = args[args.length - 1]
        , self = this;

    if (!collectionName) {
        return cb(core.error.generate(191));
    }
    connect(self, function (err) {
        if (err) {
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
MongoDriver.prototype.dropCollection = function (collectionName, cb) {
    var self = this;
    if (!collectionName) {
        return cb(core.error.generate(191));
    }
    connect(self, function (err) {
        if (err) {
            return cb(err);
        }
        self.db.collection(collectionName).drop(cb);
    });
};

/**
 *
 * @param Function}  cb
 */
MongoDriver.prototype.dropDatabase = function (cb) {
    var self = this;
    connect(self, function (err) {
        if (err) {
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
MongoDriver.prototype.count = function (collectionName, criteria, cb) {
    var self = this;
    if (!collectionName) {
        return cb(core.error.generate(191));
    }
	var options = {};
	var args = Array.prototype.slice.call(arguments)
	if(args.length === 4){
		options = cb = args[args.length - 2];
		cb = args[args.length - 1]
	}
    connect(self, function (err) {
        if (err) {
            return cb(err);
        }
        self.db.collection(collectionName).count(criteria, options, cb);
    });
};

/**
 * Returns an array of Distinct values from a collection
 *
 * @param {String} collectionName
 * @param {Array} fields
 * @param {Function} cb
 * @returns {*}
 */
MongoDriver.prototype.distinct = function () {
    var args = Array.prototype.slice.call(arguments)
        , collectionName = args.shift()
        , cb = args[args.length - 1]
        , self = this;

    if (!collectionName) {
        return cb(core.error.generate(191));
    }
    connect(self, function (err) {
        if (err) {
            return cb(err);
        }
        self.db.collection(collectionName).distinct.apply(self.db.collection(collectionName), args);
    });
};

MongoDriver.prototype.aggregate = function(){
	var args = Array.prototype.slice.call(arguments)
		, collectionName = args.shift()
		, cb = args[args.length - 1]
		, self = this;

	if (!collectionName) {
		return cb(core.error.generate(191));
	}
	connect(self, function (err) {
		if (err) {
			return cb(err);
		}
		self.db.collection(collectionName).aggregate.apply(self.db.collection(collectionName), args);
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
MongoDriver.prototype.remove = function (collectionName, criteria, cb) {
    var self = this;
    if (!criteria) {
        criteria = {};
    }

    if (!collectionName) {
        return cb(core.error.generate(191));
    }
    connect(self, function (err) {
        if (err) {
            return cb(err);
        }
        self.db.collection(collectionName).remove(criteria, {'safe': true}, cb);
    });
};

/**
 * Closes Mongo connection
 */
MongoDriver.prototype.closeDb = function () {
    var self = this;
    if (self.db) {
        self.db.close();
        self.flushDb();
    }
};

MongoDriver.prototype.flushDb = function () {
    var self = this;
    if (self.db) {
        self.db = null;
    }
    if (self.config.registryLocation && self.config.registryLocation.env && self.config.registryLocation.l1 && self.config.registryLocation.l2){
        cacheDB[self.config.registryLocation.env][self.config.registryLocation.l1][self.config.registryLocation.l2].db = null;
    }
};

MongoDriver.prototype.getMongoSkinDB = function (cb) {
    function buildDB(obj, cb) {
        var url = constructMongoLink(obj.config.name, obj.config.prefix, obj.config.servers, obj.config.URLParam, obj.config.credentials);
        if (!url) {
            return cb(core.error.generate(190));
        }

        var db = mongoSkin.db(url, obj.config.extraParam);
        return cb(null, db);
    }

    if (this.config.registryLocation && this.config.registryLocation.env && this.config.registryLocation.l1 && this.config.registryLocation.l2)
        this.config = core.registry.get(this.config.registryLocation.env)[this.config.registryLocation.l1][this.config.registryLocation.l2];

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
    var timeConnected = 0;
    var configCloneHash = null;
    if (!obj.config){
        return cb(core.error.generate(195));
    }

	if (obj.config && obj.config.registryLocation && obj.config.registryLocation.env && obj.config.registryLocation.l1 && obj.config.registryLocation.l2) {
		obj.config = core.registry.get(obj.config.registryLocation.env)[obj.config.registryLocation.l1][obj.config.registryLocation.l2];
		if (!obj.db && cacheDB[obj.config.registryLocation.env][obj.config.registryLocation.l1][obj.config.registryLocation.l2].db)
			obj.db = cacheDB[obj.config.registryLocation.env][obj.config.registryLocation.l1][obj.config.registryLocation.l2].db;
		if (cacheDB[obj.config.registryLocation.env][obj.config.registryLocation.l1][obj.config.registryLocation.l2].timeConnected)
			timeConnected = cacheDB[obj.config.registryLocation.env][obj.config.registryLocation.l1][obj.config.registryLocation.l2].timeConnected;
		if (cacheDB[obj.config.registryLocation.env][obj.config.registryLocation.l1][obj.config.registryLocation.l2].configCloneHash)
			configCloneHash = cacheDB[obj.config.registryLocation.env][obj.config.registryLocation.l1][obj.config.registryLocation.l2].configCloneHash;
	}

	if (obj.db && obj.config.timeConnected && (timeConnected === obj.config.timeConnected)) {
		return cb();
	}
	if (obj.db && (!obj.config.timeConnected || (timeConnected !== obj.config.timeConnected))) {
		var currentConfObj = merge(true, obj.config);
		delete currentConfObj.timeConnected;
		currentConfObj = objectHash(currentConfObj);
		if (currentConfObj === configCloneHash) {
			obj.config.timeConnected = new Date().getTime();
			cacheDB[obj.config.registryLocation.env][obj.config.registryLocation.l1][obj.config.registryLocation.l2].timeConnected = obj.config.timeConnected;
			return cb();
		}
	}

    if (obj.pending) {
        return setImmediate(function () {
            connect(obj, cb);
        });
    }
    obj.pending = true;

    var url = constructMongoLink(obj.config.name, obj.config.prefix, obj.config.servers, obj.config.URLParam, obj.config.credentials);
    if (!url) {
        return cb(core.error.generate(190));
    }

    mongoSkin.connect(url, obj.config.extraParam, function (err, db) {
        obj.config.timeConnected = new Date().getTime();
        if (err) {
            obj.pending = false;
            return cb(err);
        } else {
	        db.on('timeout', function(){
		        var logger = core.getLog();
		        if(logger){
			        logger.warn("Connection To Mongo has timed out!");
		        }
		        else{
			        console.log("Connection To Mongo has timed out!");
		        }
		        obj.flushDb();
	        });

	        db.on('close', function(){
		        // if (this._callBackStore) {
			     //    for(var key in this._callBackStore._notReplied) {
				 //        console.log("key: ", key);
				 //        this._callHandler(key, null, 'Connection Closed!');
			     //    }
		        // }

		        var logger = core.getLog();
		        if(logger){
			        logger.warn("Connection To Mongo has been closed!");
		        }
		        else{
			        console.log("Connection To Mongo has been closed!");
		        }
		        obj.flushDb();
	        });

	        // db.on('error', function(error){
		     //    console.log("Connection To Mongo has encountered an error!");
			 //    console.log(error);
	        // });
	        //
	        // db.on('parseError', function(error){
		     //    console.log("Connection To Mongo has encountered a parseError!");
		     //    console.log(error);
	        // });

	        if (obj.db)
		        obj.db.close();

	        obj.db = db;
	        if (obj.config.registryLocation && obj.config.registryLocation.env && obj.config.registryLocation.l1 && obj.config.registryLocation.l2) {
		        cacheDB[obj.config.registryLocation.env][obj.config.registryLocation.l1][obj.config.registryLocation.l2].db = db;
		        cacheDB[obj.config.registryLocation.env][obj.config.registryLocation.l1][obj.config.registryLocation.l2].configCloneHash = merge(true, obj.config);
		        delete  cacheDB[obj.config.registryLocation.env][obj.config.registryLocation.l1][obj.config.registryLocation.l2].configCloneHash.timeConnected;
		        cacheDB[obj.config.registryLocation.env][obj.config.registryLocation.l1][obj.config.registryLocation.l2].configCloneHash = objectHash(cacheDB[obj.config.registryLocation.env][obj.config.registryLocation.l1][obj.config.registryLocation.l2].configCloneHash);
		        cacheDB[obj.config.registryLocation.env][obj.config.registryLocation.l1][obj.config.registryLocation.l2].timeConnected = obj.config.timeConnected;
	        }
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
    if (dbName && Array.isArray(servers)) {
        var url = "mongodb://";
        if (credentials && Object.hasOwnProperty.call(credentials, 'username') && credentials.hasOwnProperty.call(credentials, 'password')) {
            url = url.concat(credentials.username, ':', credentials.password, '@');
        }

        servers.forEach(function (element, index, array) {
            url = url.concat(element.host, ':', element.port, (index === array.length - 1 ? '' : ','));
        });

        url = url.concat('/');
        if (prefix) url = url.concat(prefix);
        url = url.concat(dbName);

        if (params && 'object' === typeof params && Object.keys(params).length) {
            url = url.concat('?');
            for (var i = 0; i < Object.keys(params).length; i++) {
                url = url.concat(Object.keys(params)[i], '=', params[Object.keys(params)[i]], i === Object.keys(params).length - 1 ? '' : "&");
            }
        }
        return url;
    }
    return null;
}

module.exports = MongoDriver;