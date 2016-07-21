'use strict';
/*
 Mongo Configuration for driver version 2.1
 ------------------------------------------
 Full REF: http://mongodb.github.io/node-mongodb-native/

 CLIENT REF: http://mongodb.github.io/node-mongodb-native/2.1/api/MongoClient.html

 API REF: http://mongodb.github.io/node-mongodb-native/2.1/api

 DB REF: http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html

 REPLICASET REF: http://mongodb.github.io/node-mongodb-native/2.1/api/ReplSet.html

 Setup Mongo + SSL: https://docs.mongodb.com/manual/tutorial/configure-ssl/

 MongoDB NodeJS Driver: http://mongodb.github.io/node-mongodb-native/2.1/reference/connecting/connection-settings/
 */
module.exports = {
	//REF: https://docs.mongodb.com/manual/reference/connection-string/#connections-connection-options
	"URLParam": {
		"replicaSet": "rs",                         //name of the replicaSet if mongo connection is not standalone
		"ssl": false,                               //Whether or not the connection requires SSL
		"connectTimeoutMS": 0,                      //connection timeout value in ms or 0 for never
		"socketTimeoutMS": 0,                       //socket timeout value to attempt connection in ms or 0 for never
		"maxPoolSize": 5,                           //pooling value, default=100
		"minPoolSize": 0,                           //todo: not supported by all drivers

		"maxIdleTimeMS": 0,                         //todo: Not Supported * The maximum number of milliseconds that a connection can remain idle in the pool before being removed and closed.
		"waitQueueMultiple": 0,                     //todo: Not Supported * A number that the driver multiples the maxPoolSize value to, to provide the maximum number of threads allowed to wait for a connection to become available from the poo
		"waitQueueTimeoutMS": 0,                    //todo: Not Supported * The maximum time in milliseconds that a thread can wait for a connection to become available.

		"w": "majority",                            //values majority|number|<tag set>
		"wtimeoutMS": 0,                            //timeout for w, 0 is for never
		"journal": false,                           //Specify a journal write concern.
		"readConcernLevel": "local",
		"readPreference": "secondaryPreferred",     //if ReplicaSet, prefered instance to read from. value=primary|secondary|nearest|primaryPreferred|secondaryPreferred
		"readPreferenceTags": "TAG",
		"authSource": null,                         //specify a db to authenticate the user if the one he is connecting to doesn't do that
		"authMechanism": null,
		"gssapiServiceName": null
	},
	"extraParam": {
		"db": {
			"authSource": null,                         //specify a db to authenticate the user if the one he is connecting to doesn't do that
			"w": "majority",                           //values majority|number|<tag set>
			"wtimeoutMS": 0,                           //timeout for w, 0 is for never
			"j": false,                                //Specify a journal write concern.
			"forceServerObjectId": false,               //Force server to assign _id values instead of driver. default=false
			"serializeFunctions": false,                //Serialize functions on any object. default=false
			"ignoreUndefined": false,                   //Specify if the BSON serializer should ignore undefined fields. default=false
			"raw": false,                               //Return document results as raw BSON buffers. default=false
			"promoteLongs": true,                       //Promotes Long values to number if they fit inside the 53 bits resolution. default=true
			"bufferMaxEntries": -1,                    //Sets a cap on how many operations the driver will buffer up before giving up on getting a working connection, default is -1 which is unlimited.
			"readPreference": "secondaryPreferred",
			"pkFactory": null,                          //A primary key factory object for generation of custom _id keys.
			"promiseLibrary": null,                     //A Promise library class the application wishes to use such as Bluebird, must be ES6 compatible
			"readConcern": null
		},
		"server": {
			"poolSize": 5,
			"ssl": false,
			"sslValidate": true,                       //Validate mongod server certificate against ca, mongod server 2.4 or higher
			"checkServerIdentity": true,               //Ensure we check server identify during SSL, set to false to disable checking
			"sslCA": null,                             //Array of valid certificates either as Buffers or Strings
			"sslCert": null,                           //String or buffer containing the certificate we wish to present
			"sslKey": null,                            //String or buffer containing the certificate private key we wish to present
			"sslPass": null,                           //String or buffer containing the certificate password
			"socketOptions": {
				"autoReconnect": true,                      //Reconnect on error
				"noDelay": true,                           //TCP Socket NoDelay option
				"keepAlive": 0,                             //TCP KeepAlive on the socket with a X ms delay before start
				"connectTimeoutMS": 0,                      //connection timeout value in ms or 0 for never
				"socketTimeoutMS": 0                       //socket timeout value to attempt connection in ms or 0 for never
			},
			"reconnectTries": 30,                      //Server attempt to reconnect #times
			"reconnectInterval": 1000,                 //Server will wait # milliseconds between retries
			"monitoring": true,                        //Triggers the server instance to call ismaster
			"haInterval": 10000                        //Time between each replicaset status check
		},
		"replSet": {
			"ha": true,                                //Turn on high availability monitoring.
			"haInterval": 10000,                        //Time between each replicaset status check
			"replicaSet": "rs",
			"secondaryAcceptableLatencyMS": 15,        //Sets the range of servers to pick when using NEAREST
			"connectWithNoPrimary": false,             //Sets if the driver should connect even if no primary is available
			"poolSize": 5,
			"ssl": false,
			"checkServerIdentity": true,               //Ensure we check server identify during SSL, set to false to disable checking
			"sslValidate": true,                       //Validate mongod server certificate against ca, mongod server 2.4 or higher
			"sslCA": null,                             //Array of valid certificates either as Buffers or Strings
			"sslCert": null,                           //String or buffer containing the certificate we wish to present
			"sslKey": null,                            //String or buffer containing the certificate private key we wish to present
			"sslPass": null,                           //String or buffer containing the certificate password
			"socketOptions": {
				"noDelay": true,                           //TCP Socket NoDelay option
				"keepAlive": 0,                             //TCP KeepAlive on the socket with a X ms delay before start
				"connectTimeoutMS": 0,                      //connection timeout value in ms or 0 for never
				"socketTimeoutMS": 0                       //socket timeout value to attempt connection in ms or 0 for never
			}
		},
		"mongos": {
			"ha": true,                                //Turn on high availability monitoring.
			"haInterval": 10000,                        //Time between each replicaset status check
			"poolSize": 5,
			"acceptableLatencyMS": 15,        //Sets the range of servers to pick when using NEAREST
			"ssl": false,
			"checkServerIdentity": true,               //Ensure we check server identify during SSL, set to false to disable checking
			"sslValidate": true,                       //Validate mongod server certificate against ca, mongod server 2.4 or higher
			"sslCA": null,                             //Array of valid certificates either as Buffers or Strings
			"sslCert": null,                           //String or buffer containing the certificate we wish to present
			"sslKey": null,                            //String or buffer containing the certificate private key we wish to present
			"sslPass": null,                           //String or buffer containing the certificate password
			"socketOptions": {
				"noDelay": true,                           //TCP Socket NoDelay option
				"keepAlive": 0,                             //TCP KeepAlive on the socket with a X ms delay before start
				"connectTimeoutMS": 0,                      //connection timeout value in ms or 0 for never
				"socketTimeoutMS": 0                       //socket timeout value to attempt connection in ms or 0 for never
			}
		}
	}
};