"use strict";

/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */

function Urac(param) {
	let _self = this;
	
	_self.soajs = param.soajs;
	_self.userRecord = null;
	_self.user_ACL = null;
	_self.id = null;
	if (param._id) {
		_self.id = param._id;
	}
}

/**
 * Initialize Driver and set userRecord if found
 * @param cb
 */
Urac.prototype.init = function (cb) {
	let _self = this;
	if (_self.userRecord && _self.user_ACL) {
		return cb(null, _self.userRecord);
		
	} else {
		let error = new Error('oAuth userId is not available to pull URAC profile');
		cb(error, null);
	}
};

/**
 * Get User Profile, if parameter provided, return Config and accessToken as well.
 * @param {Boolean} _ALL
 * @returns {*}
 */
Urac.prototype.getProfile = function (_ALL) {
	let _self = this;
	if (!_self.userRecord) {
		return null;
	}
	let urac = null;
	if (_self.userRecord.username) {
		urac = {
			"_id": _self.userRecord._id,
			"username": _self.userRecord.username,
			"firstName": _self.userRecord.firstName,
			"lastName": _self.userRecord.lastName,
			"email": _self.userRecord.email,
			"groups": _self.userRecord.groups,
			"profile": _self.userRecord.profile,
			"tenant": _self.userRecord.tenant
		};
		
		if (_self.userRecord.socialLogin) {
			urac.socialLogin = {
				"strategy": _self.userRecord.socialLogin.strategy,
				"id": _self.userRecord.socialLogin.id
			};
		}
		
		if (_ALL) {
			if (_self.userRecord.socialLogin) {
				urac.socialLogin.accessToken = _self.userRecord.socialLogin.accessToken;
			}
			
			urac.config = _self.userRecord.config;
			urac.groupsConfig = _self.userRecord.groupsConfig;
		}
	}
	else if (_self.userRecord.userId) {
		urac = {
			"_id": _self.userRecord._id,
			"username": _self.userRecord.userId,
			"tenant": {"id": _self.userRecord.tId}
		};
	}
	else if (_self.userRecord) {
		urac = {
			"_id": _self.userRecord.id || _self.userRecord.user,
			"username": _self.userRecord.user,
			"tenant": {},
			"profile": _self.userRecord
		};
	}
	return urac;
};

/**
 * Get User Acl in current environment
 * @returns {*}
 */
Urac.prototype.getAcl = function () {
	let _self = this;
	
	if (_self.user_ACL && _self.user_ACL.acl) {
		return _self.user_ACL.acl;
	} else {
		return null;
	}
};


/**
 * Get User Groups
 * @returns {*}
 */
Urac.prototype.getGroups = function () {
	let _self = this;
	if (!_self.userRecord) {
		return null;
	}
	let groups = null;
	if (_self.userRecord.groups) {
		groups = _self.userRecord.groups;
	}
	return groups;
};


module.exports = Urac;