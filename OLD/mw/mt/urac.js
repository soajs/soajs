"use strict";
const uracDriver = require('soajs.urac.driver');
const coreModules = require("soajs.core.modules");
let provision = coreModules.provision;

const lib = require("./lib.js");

function urac(param) {
    let _self = this;

    _self.soajs = param.soajs;
    _self.userRecord = null;
    _self.user_ACL = null;
    _self.id = null;

    if (param.oauth && 0 === param.oauth.type)
        _self.userRecord = param.oauth.bearerToken;
    else {
        // if type === 2
        if (param.oauth && param.oauth.bearerToken && param.oauth.bearerToken.user) {

            _self.id = param.oauth.bearerToken.user.id;
            if (param.oauth.bearerToken.user.username)
                _self.username = param.oauth.bearerToken.user.username;

            if (param.oauth.bearerToken.user.loginMode === "oauth") {
                _self.userRecord = param.oauth.bearerToken.user;
            }
            else if (_self.soajs.registry.serviceConfig.oauth.getUserFromToken) {
                _self.userRecord = param.oauth.bearerToken.user;
            }
        }
        else if (param._id) {
            _self.id = param._id;
            _self.username = param.username;
        }
    }
}

/**
 * Initialize Driver and set userRecord if found
 * @param cb
 */
urac.prototype.init = function (cb) {
    let _self = this;
    if (_self.userRecord) {
        if (_self.user_ACL)
            return cb(null, _self.userRecord);
        else {
            _self.resolveACL(() => {
                return cb(null, _self.userRecord);
            });
        }
    }
    else if (_self.id) {
        uracDriver.getRecord(_self.soajs, {id: _self.id.toString(), username: _self.username}, function (err, record) {
            if (record) {
                _self.userRecord = record;
                _self.resolveACL(() => {
                    return cb(null, _self.userRecord);
                });
            }
            else {
                if (err && err.msg) {
                    err = new Error(err.msg);
                }
                return cb(err, null);
            }
        });
    }
    else {
        let error = new Error('oAuth userId is not available to pull URAC profile');
        cb(error, null);
    }
};


urac.prototype.resolveACL = function (cb) {
    let _self = this;
    if (_self.userRecord) {
        let productCode = _self.soajs.tenant.application.product;
        if (_self.userRecord.groupsConfig && _self.userRecord.groupsConfig.allowedPackages) {
            if (_self.userRecord.groupsConfig.allowedPackages[productCode]) {
                provision.getPackagesData(_self.userRecord.groupsConfig.allowedPackages[productCode], (error, arrayACLs) => {
                    if (error) {
                        return cb();
                    }
                    else {
                        lib.mergeACLArray(arrayACLs, (error, ACLobject) => {
                            if (ACLobject)
                                _self.user_ACL = ACLobject;

                            return cb();
                        });
                    }
                });
            }
            else
                return cb();
        }
        else
            return cb();
    }
    else
        return cb();
};

/**
 * Get User Profile, if parameter provided, return Config and accessToken as well.
 * @param {Boolean} _ALL
 * @returns {*}
 */
urac.prototype.getProfile = function (_ALL) {
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
urac.prototype.getAcl = function () {
    let _self = this;

    if (_self.user_ACL && _self.user_ACL.acl)
        return _self.user_ACL.acl;
    else
        return null;

    /*
    let productCode = _self.soajs.tenant.application.product;

    let acl = null;

    if (!_self.userRecord) {
        return acl;
    }

    //for now we will only support 1 package per product
    if (!acl && _self.userRecord.groupsConfig && _self.userRecord.groupsConfig.allowedPackages) {
        if (_self.userRecord.groupsConfig.allowedPackages[productCode]) {
            acl = _self.userRecord.groupsConfig.allowedPackages[productCode][0];
        }
    }

    return acl;
    */
};

/**
 * Get user Acl in all environments
 */
urac.prototype.getAclAllEnv = function () {
    let _self = this;

    if (_self.user_ACL && _self.user_ACL.acl_all_env)
        return _self.user_ACL.acl_all_env;
    else
        return null;

    /*
    let productCode = _self.soajs.tenant.application.product;

    let acl = null;

    if (!_self.userRecord) {
        return acl;
    }

    //for now we will only support 1 package per product
    if (!acl && _self.userRecord.groupsConfig && _self.userRecord.groupsConfig.allowedPackages) {
        if (_self.userRecord.groupsConfig.allowedPackages[productCode])
            acl = _self.userRecord.groupsConfig.allowedPackages[productCode][0];
    }

    return acl;
    */
};

/**
 * Get User Config
 * @returns {*}
 */
urac.prototype.getConfig = function () {
    let _self = this;
    let key = _self.soajs.tenant.key.iKey;
    if (!_self.userRecord) {
        return null;
    }
    let config = null;

    if (_self.userRecord.config && _self.userRecord.config.keys) {
        if (_self.userRecord.config.keys[key] && _self.userRecord.config.keys[key].config) {
            config = _self.userRecord.config.keys[key].config;
        }
    }

    return config;
};

/**
 * Get User Groups
 * @returns {*}
 */
urac.prototype.getGroups = function () {
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

module.exports = urac;