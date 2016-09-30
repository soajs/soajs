'use strict';
var bcrypt = require('bcrypt');

var authorization = {
	"setCookie": function(auth, secret, cookieName) {
		var authdecypherd = authorization.get(auth);

		if(authdecypherd) {
			var securityId = authorization.umask(authdecypherd);

			if(securityId) {
				var crypto = require('crypto');
				var sign = function(val, secret) {
					if('string' !== typeof val) throw new TypeError('cookie required');
					if('string' !== typeof secret) throw new TypeError('secret required');
					return val + '.' + crypto.createHmac('sha256', secret).update(val).digest('base64').replace(/\=+$/, '');
				};
				var signed = 's:' + sign(securityId, secret);

				return (cookieName + '=' + signed);
			}
		}
		return null;
	},
	"set": function(src, sid) {
		var securityIdMask = authorization.mask(sid);
		if (src)
			src.set('soajsauth', "Basic " + (new Buffer("soajs:" + securityIdMask).toString('base64')));
		else
			return ({'soajsauth': "Basic " + (new Buffer("soajs:" + securityIdMask).toString('base64'))});
	},
	"get": function(auth) {
		var base64 = decodeURIComponent(auth);
		base64 = base64.split('Basic ')[1];
		if(base64) {
			var ascii = new Buffer(base64, 'base64').toString('ascii');
			if(ascii.indexOf('soajs:') === 0) {
				return ascii.split('soajs:')[1];
			}
		}
		return null;
	},
	"mask": function(styleId) {
		var cyphersList = Object.keys(cyphers);
		var styleCode = (arguments.length === 2) ? arguments[1] : cyphersList[ Math.floor((Math.random() * cyphersList.length)) ];
		styleId = styleCode + cyphers[styleCode].cypher(styleId);
		return styleId;
	},
	"umask": function(styleId) {
		var styleCode = styleId.substr(0, 3);
		if(cyphers[styleCode]) {
			styleId = cyphers[styleCode].decypher(styleId.slice(3));
		} else {
			styleId = styleId.slice(3);
		}
		return styleId;
	},
	"generate": function(id, secret){
		return "Basic " + new Buffer(id.toString() + ":" + secret.toString()).toString('base64');
	}
};

var cyphers = {
	"C01":{
		"cypher": function(sid){
			var sidC = null;
			if(sid && 32 === sid.length) {
				sidC = sid.substr(0, 3) + sid[11] + sid.substr(4, 3) + sid[15] + sid.substr(8, 3) + sid[3] + sid.substr(12, 3) + sid[7] + sid.substr(16);
			}
			return sidC;
		},
		"decypher": function(sid){
			var sidC = null;
			if(sid && 32 === sid.length) {
				sidC = sid.substr(0, 3) + sid[11] + sid.substr(4, 3) + sid[15] + sid.substr(8, 3) + sid[3] + sid.substr(12, 3) + sid[7] + sid.substr(16);
			}
			return sidC;
		}
	},
	"C02":{
		"cypher": function(sid){
			var sidC = null;
			if(sid && 32 === sid.length) {
				sidC = sid.substr(0, 4) + sid[12] + sid.substr(5, 4) + sid[15] + sid.substr(10, 2) + sid[4] + sid.substr(13, 2) + sid[9] + sid.substr(16);
			}
			return sidC;
		},
		"decypher": function(sid){
			var sidC = null;
			if(sid && 32 === sid.length) {
				sidC = sid.substr(0, 4) + sid[12] + sid.substr(5, 4) + sid[15] + sid.substr(10, 2) + sid[4] + sid.substr(13, 2) + sid[9] + sid.substr(16);
			}
			return sidC;
		}
	},
	"C03":{
		"cypher": function(sid){
			var sidC = null;
			if(sid && 32 === sid.length) {
				sidC = sid.substr(0, 5) + sid[13] + sid.substr(6, 5) + sid[15] + sid.substr(12, 1) + sid[5] + sid.substr(14, 1) + sid[11] + sid.substr(16);
			}
			return sidC;
		},
		"decypher": function(sid){
			var sidC = null;
			if(sid && 32 === sid.length) {
				sidC = sid.substr(0, 5) + sid[13] + sid.substr(6, 5) + sid[15] + sid.substr(12, 1) + sid[5] + sid.substr(14, 1) + sid[11] + sid.substr(16);
			}
			return sidC;
		}
	}
};

var hasher = {
	"init": function(config){
		this.config = config;
	},

	"hash" : function() {
		var plainText = arguments[0];
		if(arguments.length === 3 && arguments[1] === true && typeof (arguments[2]) === 'function'){
			var cb = arguments[2];
			bcrypt.genSalt(this.config.hashIterations, this.config.seedLength, function(err, salt) {
				if(err) return cb(err);
				bcrypt.hash(plainText, salt, cb);
			});
		}
		else{
			var salt = bcrypt.genSaltSync(this.config.hashIterations, this.config.seedLength);
			return bcrypt.hashSync(plainText, salt);
		}
	},

	"compare": function(plainText, hashText, cb){
		return bcrypt.compare(plainText, hashText, cb);
	}
};

module.exports = {
	"authorization": authorization,
	"hasher": hasher
};