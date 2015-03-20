'use strict';
var error = require("../error/index");
var crypto = require('crypto');

//NOTE: below are default values
var algorithm = 'aes256';
var password = 'soajs key default';

var key = {
	"getInfo": function(extKey, config, cb) {
        if (config && typeof config === "object") {
            algorithm = config.algorithm || algorithm;
            password = config.password || password;
        }
		verify(extKey, function(err, keyObj) {
			if(err) {
				return cb(err);
			}
			cb(null, keyObj);
		});
	},
	"generateInternalKey": function(cb) {
		generateUniqueId(16, function(err, uId) {
			if(err) {
				return cb(err);
			}
			cb(null, uId);
		});
	},
	"generateExternalKey": function(key, tenant, application, config, cb) {
        if (config && typeof config === "object") {
            algorithm = config.algorithm || algorithm;
            password = config.password || password;
        }
		generateUniqueId(12, function(err, uId) {
			if(err) {
				return cb(err);
			}
			var text = tenant.id + uId + key + application.package.length + "_" + application.package;
			var cipher = crypto.createCipher(algorithm, password);
			var extKey = cipher.update(text, 'utf8', 'hex') + cipher.final('hex');

			if(extKey.length === 192) {
				return cb(null, extKey);
			}
			cb(error.generate(103), null);
		});
	}
};

var verify = function(extKey, cb) {
	var decipher = crypto.createDecipher(algorithm, password);
	try {
		var decrypted = decipher.update(extKey, 'hex', 'utf8') + decipher.final('utf8');
		//85 = (24)tenant._id.length + (24)uId + (32)key.length + (2 at least)[9]*_ + (3)the minimum number of character required for package code
		if(decrypted.length < 85) {
			return cb(error.generate(100));
		}
		var obj = {
			"tenantId": decrypted.substr(0, 24),
			"uId": decrypted.substr(24, 24),
			"key": decrypted.substr(48, 32)
		};
		var packageTxt = decrypted.slice(80);
		var n = packageTxt.indexOf("_");
		if(n === -1) {
			return cb(error.generate(100));
		}
		var packageCodeLen = parseInt(packageTxt.substr(0, n));
		if(isNaN(packageCodeLen)) {
			return cb(error.generate(100));
		}
		var packageCode = packageTxt.substr(n + 1);
		if(packageCodeLen !== packageCode.length) {
			return cb(error.generate(100));
		}
		obj.packageCode = packageCode;
		cb(null, obj);
	} catch(err) {
		cb(err);
	}
};

function generateUniqueId(len, cb) {
	var id = "";
	try {
		id = crypto.randomBytes(len).toString('hex');
		cb(null, id);
	} catch(err) {
		cb(err);
	}
}

module.exports = key;