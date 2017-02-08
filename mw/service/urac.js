"use strict";
var uracDriver = require('soajs.urac.driver');

function urac(param) {
    var _self = this;

    _self.soajs = param.soajs;

    _self.id = null;
    if (param.oauth && param.oauth.bearerToken && param.oauth.bearerToken.userId)
        _self.id = param.oauth.bearerToken.userId;

    _self.userRecord = null;
}

urac.prototype.init = function (cb) {
    var _self = this;
    if (_self.id) {
        uracDriver.getRecord(_self.soajs, {id: _self.id.toString()}, function (err, record) {
            cb(err, record);
        });
    }
    else {
        var error = new Error('oAuth userId is not available to pull URAC profile');
        cb(error, null);
    }
};
urac.prototype.getProfile = function (_ALL) {
    var _self = this;
    if (!_self.userRecord) {
        return null;
    }
    var urac = null;
    if (_self.userRecord.username) {
        urac = {
            "_id": _self.userRecord._id,
            "username": _self.userRecord.username,
            "firstName": _self.userRecord.firstName,
            "lastName": _self.userRecord.lastName,
            "email": _self.userRecord.email,
            "groups": _self.userRecord.groups,
            "profile": _self.userRecord.profile,
            "tenant": _self.userRecord.tenant,
            "oauthRefreshToken": _self.userRecord.oauthRefreshToken,
            "oauthAccessToken": _self.userRecord.oauthAccessToken
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
        }
    }
    return urac;
};
urac.prototype.getAcl = function () {
    var _self = this;
    var key = _self.soajs.tenant.key.iKey;
    var packageCode = _self.soajs.tenant.application.package;

    var acl = null;

    if (!_self.userRecord) {
        return acl;
    }

    if (_self.userRecord.config) {
        if (_self.userRecord.config.keys && _self.userRecord.config.keys[key] && _self.userRecord.config.keys[key].acl) {
            acl = _self.userRecord.config.keys[key].acl;
        }
        if (!acl && _self.userRecord.config.packages && _self.userRecord.config.packages[packageCode] && _self.userRecord.config.packages[packageCode].acl) {
            acl = _self.userRecord.config.packages[packageCode].acl;
        }
    }

    if (!acl && _self.userRecord.groupsConfig) {
        if (_self.userRecord.groupsConfig.keys && _self.userRecord.groupsConfig.keys[key] && _self.userRecord.groupsConfig.keys[key].acl) {
            acl = _self.userRecord.groupsConfig.keys[key].acl;
        }
        if (_self.userRecord.groupsConfig.packages && _self.userRecord.groupsConfig.packages[packageCode] && _self.userRecord.groupsConfig.packages[packageCode].acl) {
            acl = _self.userRecord.groupsConfig.packages[packageCode].acl;
        }
    }

    return acl;
};
urac.prototype.getConfig = function () {
    var _self = this;
    var key = _self.soajs.tenant.iKey;
    if (!_self.userRecord) {
        return null;
    }
    var config = null;
    if (_self.userRecord.config && _self.userRecord.config.keys) {
        if (_self.userRecord.config.keys[key] && _self.userRecord.config.keys[key].config) {
            config = _self.userRecord.config.keys[key].config;
        }
    }

    return config;
};
urac.prototype.getGroups = function () {
    var _self = this;
    if (!_self.userRecord) {
        return null;
    }
    var groups = null;
    if (_self.userRecord.groups) {
        groups = _self.userRecord.groups;
    }
    return groups;
};

module.exports = urac;