"use strict";
var merge = require('merge');

var regEnvironment = (process.env.SOAJS_ENV || "dev");
regEnvironment = regEnvironment.toLowerCase();

/**
 *
 * @param {Object} obj={session: {}, req: {}, tenant:{id: xxx, key: xxx}, product: {product: xxx, package: xxx, appId: xxx}, request: {service: xxx, api: xxx}, device: {}, geo: {}}
 */
function MultiTenantSession(obj) {
    this.session = obj.session;
    this.req = obj.req;
    this.assure({"tenantId": obj.tenant.id, "key": obj.tenant.key});
    this.setPersistSessionHOLDER({"tenant": obj.tenant, "product": obj.product, "request": obj.request});
    this.preserveTenantSession();
    this.setCLIENTINFO({"device": obj.device, "geo": obj.geo, "extKey": obj.tenant.extKey});

}

/**
 *
 * @param {Object} obj={tenantId: xxx, key: xxx}
 */
MultiTenantSession.prototype.assure = function (obj) {
    if (!this.session.persistSession) {
        this.session.persistSession = {};
    }
    if (!this.session.persistSession.state) {
        this.session.persistSession.state = {};
    }
    if (!this.session.persistSession.holder) {
        this.session.persistSession.holder = {};
    }

    if (!this.session.sessions) {
        this.session.sessions = {};
        this.setPersistSessionSTATE("ALL");
    }
    if (!this.session.sessions[obj.tenantId]) {
        this.session.sessions[obj.tenantId] = {};
        this.setPersistSessionSTATE("TENANT");
    }
    if (!this.session.sessions[obj.tenantId].urac) {
        this.session.sessions[obj.tenantId].urac = null;
    }
    if (!this.session.sessions[obj.tenantId].clientInfo) {
        this.session.sessions[obj.tenantId].clientInfo = {'device': {}, 'geo': {}};
    }
    if (!this.session.sessions[obj.tenantId].keys) {
        this.session.sessions[obj.tenantId].keys = {};
    }
    if (!this.session.sessions[obj.tenantId].keys[obj.key]) {
        this.session.sessions[obj.tenantId].keys[obj.key] = {
            "services": {}
        };
        this.setPersistSessionSTATE("KEY");
    }
};

/**
 *
 */
MultiTenantSession.prototype.preserveTenantSession = function () {
    var tId = this.session.persistSession.holder.tenant.id;
    var key = this.session.persistSession.holder.tenant.key;

    for (var tenant in this.session.sessions) {
        if (tenant !== tId) {
            delete this.session.sessions[tenant];
        } else {
            if (this.session.sessions[tId] && this.session.sessions[tId].keys) {
                for (var k in this.session.sessions[tId].keys) {
                    if (k !== key) {
                        delete this.session.sessions[tId].keys[k];
                    }
                }
            }
        }
    }
};

/**
 *
 * @param state
 */
MultiTenantSession.prototype.setPersistSessionSTATE = function (state) {
    if (!this.session.persistSession) {
        this.session.persistSession = {};
    }
    if (!this.session.persistSession.state) {
        this.session.persistSession.state = {};
    }

    if (this.session.persistSession.state.DONE)
        delete this.session.persistSession.state.DONE;

    this.session.persistSession.state[state] = true;
};

/**
 *
 * @param holder
 */
MultiTenantSession.prototype.setPersistSessionHOLDER = function (holder) {
    if (!this.session.persistSession) {
        this.session.persistSession = {};
    }
    this.session.persistSession.holder = holder;
};

/**
 *
 * @param clientInfo
 */
MultiTenantSession.prototype.setCLIENTINFO = function (clientInfo) {
    var tId = this.session.persistSession.holder.tenant.id;

    //TODO: check if clientInfo is still the same

    this.session.sessions[tId].clientInfo = clientInfo;
    //TODO: discuss with team if this is needed
    //this.setPersistSessionSTATE("CLIENTINFO");
};

/**
 *
 */
MultiTenantSession.prototype.setURACKEY = function () {
    var tId = this.session.persistSession.holder.tenant.id;
    var key = this.session.persistSession.holder.tenant.key;
    if (!this.session.sessions[tId].urac)
        return;
    if (this.session.sessions[tId].urac.config.keys[key])
        return;
    else {
        this.session.sessions[tId].urac.config.keys[key] = {};
        this.setPersistSessionSTATE("URACKEY");
        return;
    }
};

/**
 *
 */
MultiTenantSession.prototype.setURACPACKAGE = function () {
    var tId = this.session.persistSession.holder.tenant.id;
    var packageCode = this.session.persistSession.holder.product.package;
    if (!this.session.sessions[tId].urac)
        return;
    if (this.session.sessions[tId].urac.config.packages[packageCode])
        return;
    else {
        this.session.sessions[tId].urac.config.packages[packageCode] = {};
        this.setPersistSessionSTATE("URACPACKAGE");
        return;
    }
};

/**
 *
 * @param acl
 * @param cb
 * @returns {*}
 */
MultiTenantSession.prototype.setURACKEYACL = function (acl, cb) {
    var tId = this.session.persistSession.holder.tenant.id;
    var key = this.session.persistSession.holder.tenant.key;
    if (!this.session.sessions[tId].urac) {
        if (cb && (typeof cb === "function")) {
            return cb();
        }
        else
            return;
    }
    this.setURACKEY();
    this.session.sessions[tId].urac.config.keys[key].acl = acl;
    this.setPersistSessionSTATE("URACKEYACL");
    if (cb && (typeof cb === "function")) {
        this.req.sessionStore.set(this.req.sessionID, this.session, cb);
    }
};

/**
 *
 * @param config
 * @param cb
 * @returns {*}
 */
MultiTenantSession.prototype.setURACKEYCONFIG = function (config, cb) {
    var tId = this.session.persistSession.holder.tenant.id;
    var key = this.session.persistSession.holder.tenant.key;
    if (!this.session.sessions[tId].urac) {
        if (cb && (typeof cb === "function")) {
            return cb();
        }
        else
            return;
    }
    this.setURACKEY();
    this.session.sessions[tId].urac.config.keys[key].config = config;
    this.setPersistSessionSTATE("URACKEYCONFIG");
    if (cb && (typeof cb === "function")) {
        this.req.sessionStore.set(this.req.sessionID, this.session, cb);
    }
};

/**
 *
 * @param cb
 */
MultiTenantSession.prototype.clearURAC = function (cb) {
    var tId = this.session.persistSession.holder.tenant.id;
    if (this.session.sessions[tId].urac) {
        this.session.sessions[tId].urac = null;
        this.setPersistSessionSTATE("URAC");
        if (cb && (typeof cb === "function")) {
            this.req.sessionStore.set(this.req.sessionID, this.session, cb);
        }
    }
    else
        cb();
};

/**
 *
 * @param urac
 * @param cb
 * @returns {*}
 */
MultiTenantSession.prototype.setURAC = function (urac, cb) {
    var tId = this.session.persistSession.holder.tenant.id;

    if (!urac) {
        if (cb && (typeof cb === "function")) {
            return cb();
        }
        else
            return;
    }

    //NOTE: we need to assure config = {packages: {}, keys : {}}
    if (!urac.config)
        urac.config = {};
    if (!urac.config.packages)
        urac.config.packages = {};
    else {
        for (var packageCode in urac.config.packages) {
            if (Object.hasOwnProperty.call(urac.config.packages, packageCode)) {
                var ACL = urac.config.packages[packageCode].acl;
                urac.config.packages[packageCode].acl_all_env = urac.config.packages[packageCode].acl;
                if (ACL && typeof ACL === "object") {
                    if (ACL[regEnvironment] && (ACL[regEnvironment].access || ACL[regEnvironment].apis || ACL[regEnvironment].apisRegExp || ACL[regEnvironment].apisPermission))
                        urac.config.packages[packageCode].acl = ACL[regEnvironment];
                }
            }
        }
    }
    if (!urac.config.keys)
        urac.config.keys = {};
    else {
        //urac.config.keys[key].acl
        for (var key in urac.config.keys) {
            if (Object.hasOwnProperty.call(urac.config.keys, key)) {
                var ACL = urac.config.keys[key].acl;
                urac.config.keys[key].acl_all_env = urac.config.keys[key].acl;
                if (ACL && typeof ACL === "object") {
                    if (ACL[regEnvironment] && (ACL[regEnvironment].access || ACL[regEnvironment].apis || ACL[regEnvironment].apisRegExp || ACL[regEnvironment].apisPermission))
                        urac.config.keys[key].acl = ACL[regEnvironment];
                }
            }
        }
    }

    //Groups ACL
    // - merge all group.config.keys[key].acl
    // - merge all group.config.packages[packageCode].acl
    if (urac.groupsConfig) {
        var mergedInfo = {"keys": {}, "packages": {}};
        for (var i = 0; i <= urac.groupsConfig.length; i++) {
            var group = urac.groupsConfig[i];
            if (group && group.config) {
                if (group.config.keys) {
                    //merge all keys ACL
                    for (var key in group.config.keys) {
                        if (Object.hasOwnProperty.call(group.config.keys, key)) {
                            var ACL = group.config.keys[key].acl;
                            if (ACL) {
                                if (mergedInfo.keys[key] && mergedInfo.keys[key].acl_all_env)
                                    mergedInfo.keys[key].acl_all_env = merge.recursive(true, mergedInfo.keys[key].acl_all_env, ACL);
                                else
                                    mergedInfo.keys[key] = {"acl_all_env": ACL};

                                if (mergedInfo.keys[key] && mergedInfo.keys[key].acl)
                                    mergedInfo.keys[key].acl = mergedInfo.keys[key].acl_all_env[regEnvironment];
                                else
                                    mergedInfo.keys[key] = {"acl": mergedInfo.keys[key].acl_all_env[regEnvironment]};
                            }
                        }
                    }
                }
                if (group.config.packages) {
                    //merge all packages ACL
                    for (var packageCode in group.config.packages) {
                        if (Object.hasOwnProperty.call(group.config.packages, packageCode)) {
                            var ACL = group.config.packages[packageCode].acl;
                            if (ACL) {
                                if (mergedInfo.packages[packageCode] && mergedInfo.packages[packageCode].acl_all_env)
                                    mergedInfo.packages[packageCode].acl_all_env = merge.recursive(true, mergedInfo.packages[packageCode].acl_all_env, ACL);
                                else
                                    mergedInfo.packages[packageCode] = {"acl_all_env": ACL};

                                if (mergedInfo.packages[packageCode] && mergedInfo.packages[packageCode].acl)
                                    mergedInfo.packages[packageCode].acl = mergedInfo.packages[packageCode].acl_all_env[regEnvironment];
                                else
                                    mergedInfo.packages[packageCode] = {"acl": mergedInfo.packages[packageCode].acl_all_env[regEnvironment]};
                            }
                        }
                    }
                }
            }
        }
        urac.groupsConfig = mergedInfo;
    }

    this.session.sessions[tId].urac = urac;

    this.setPersistSessionSTATE("URAC");
    if (cb && (typeof cb === "function")) {
        this.req.sessionStore.set(this.req.sessionID, this.session, cb);
    }
};

/**
 *
 * @param acl
 * @param cb
 * @returns {*}
 */
MultiTenantSession.prototype.setURACPACKAGEACL = function (acl, cb) {
    var tId = this.session.persistSession.holder.tenant.id;
    var packageCode = this.session.persistSession.holder.product.package;
    if (!this.session.sessions[tId].urac) {
        if (cb && (typeof cb === "function")) {
            return cb();
        }
        else
            return;
    }
    this.setURACPACKAGE();
    this.session.sessions[tId].urac.config.packages[packageCode].acl = acl;
    this.setPersistSessionSTATE("URACPACKAGEACL");
    if (cb && (typeof cb === "function")) {
        this.req.sessionStore.set(this.req.sessionID, this.session, cb);
    }
};

/**
 *
 * @param obj
 * @param cb
 */
MultiTenantSession.prototype.setSERVICE = function (obj, cb) {
    var tId = this.session.persistSession.holder.tenant.id;
    var key = this.session.persistSession.holder.tenant.key;
    var service = this.session.persistSession.holder.request.service;
    this.session.sessions[tId].keys[key].services[service] = obj;
    this.setPersistSessionSTATE("SERVICE");
    if (cb && (typeof cb === "function")) {
        this.req.sessionStore.set(this.req.sessionID, this.session, cb);
    }
};

/**
 *
 * @returns {*}
 */
MultiTenantSession.prototype.getSERVICE = function () {
    var tId = this.session.persistSession.holder.tenant.id;
    var key = this.session.persistSession.holder.tenant.key;
    var service = this.session.persistSession.holder.request.service;
    var obj = this.session.sessions[tId].keys[key].services[service];

    return obj;
};

/**
 *
 * @param cb
 */
MultiTenantSession.prototype.deleteTenantSession = function (cb) {
    var tId = this.session.persistSession.holder.tenant.id;
    this.session.sessions[tId] = null;
    this.setPersistSessionSTATE("TENANT");
    if (cb && (typeof cb === "function")) {
        this.req.sessionStore.set(this.req.sessionID, this.session, cb);
    }
};

/**
 *
 * @returns {*}
 */
MultiTenantSession.prototype.getAcl = function () {
    var tId = this.session.persistSession.holder.tenant.id;
    var key = this.session.persistSession.holder.tenant.key;
    var packageCode = this.session.persistSession.holder.product.package;
    if (!this.session.sessions[tId].urac) {
        return null;
    }
    var acl = null;

    if (this.session.sessions[tId].urac.config.keys[key] && this.session.sessions[tId].urac.config.keys[key].acl)
        acl = this.session.sessions[tId].urac.config.keys[key].acl;
    if (!acl && this.session.sessions[tId].urac.config.packages[packageCode] && this.session.sessions[tId].urac.config.packages[packageCode].acl)
        acl = this.session.sessions[tId].urac.config.packages[packageCode].acl;

    if (!acl && this.session.sessions[tId].urac.groupsConfig) {
        if (this.session.sessions[tId].urac.groupsConfig.keys[key] && this.session.sessions[tId].urac.groupsConfig.keys[key].acl)
            acl = this.session.sessions[tId].urac.groupsConfig.keys[key].acl;
        if (this.session.sessions[tId].urac.groupsConfig.packages[packageCode] && this.session.sessions[tId].urac.groupsConfig.packages[packageCode].acl)
            acl = this.session.sessions[tId].urac.groupsConfig.packages[packageCode].acl;
    }
    return acl;
};
/**
 *
 * @returns {*}
 */
MultiTenantSession.prototype.getAclAllEnv = function () {
    var tId = this.session.persistSession.holder.tenant.id;
    var key = this.session.persistSession.holder.tenant.key;
    var packageCode = this.session.persistSession.holder.product.package;
    if (!this.session.sessions[tId].urac) {
        return null;
    }
    var acl = null;

    if (this.session.sessions[tId].urac.config.keys[key] && this.session.sessions[tId].urac.config.keys[key].acl_all_env)
        acl = this.session.sessions[tId].urac.config.keys[key].acl_all_env;
    if (!acl && this.session.sessions[tId].urac.config.packages[packageCode] && this.session.sessions[tId].urac.config.packages[packageCode].acl_all_env)
        acl = this.session.sessions[tId].urac.config.packages[packageCode].acl_all_env;

    if (!acl && this.session.sessions[tId].urac.groupsConfig) {
        if (this.session.sessions[tId].urac.groupsConfig.keys[key] && this.session.sessions[tId].urac.groupsConfig.keys[key].acl_all_env)
            acl = this.session.sessions[tId].urac.groupsConfig.keys[key].acl_all_env;
        if (this.session.sessions[tId].urac.groupsConfig.packages[packageCode] && this.session.sessions[tId].urac.groupsConfig.packages[packageCode].acl_all_env)
            acl = this.session.sessions[tId].urac.groupsConfig.packages[packageCode].acl_all_env;
    }
    return acl;
};
/**
 *
 *
 * @returns {*}
 */
MultiTenantSession.prototype.getPackageAcl = function (packageCode) {
    var tId = this.session.persistSession.holder.tenant.id;
    if (!this.session.sessions[tId].urac) {
        return null;
    }
    var acl = null;
    if (!acl && this.session.sessions[tId].urac.config.packages[packageCode] && this.session.sessions[tId].urac.config.packages[packageCode].acl)
        acl = this.session.sessions[tId].urac.config.packages[packageCode].acl;
    return acl;
};

/**
 *
 * @returns {*}
 */
MultiTenantSession.prototype.getConfig = function () {
    var tId = this.session.persistSession.holder.tenant.id;
    var key = this.session.persistSession.holder.tenant.key;
    if (!this.session.sessions[tId].urac) {
        return null;
    }
    var config = null;
    if (this.session.sessions[tId].urac.config.keys[key] && this.session.sessions[tId].urac.config.keys[key].config)
        config = this.session.sessions[tId].urac.config.keys[key].config;

    return config;
};

/**
 *
 * @returns {*}
 */
MultiTenantSession.prototype.getUrac = function (_ALL) {
    var tId = this.session.persistSession.holder.tenant.id;
    if (!this.session.sessions[tId].urac) {
        return null;
    }
    var urac = null;
    if (this.session.sessions[tId].urac.username) {
        urac = {
            "_id": this.session.sessions[tId].urac._id,
            "username": this.session.sessions[tId].urac.username,
            "firstName": this.session.sessions[tId].urac.firstName,
            "lastName": this.session.sessions[tId].urac.lastName,
            "email": this.session.sessions[tId].urac.email,
            "groups": this.session.sessions[tId].urac.groups,
            "profile": this.session.sessions[tId].urac.profile,
            "tenant": this.session.sessions[tId].urac.tenant,
            "oauthRefreshToken": this.session.sessions[tId].urac.oauthRefreshToken,
            "oauthAccessToken": this.session.sessions[tId].urac.oauthAccessToken
        };
        
        if(this.session.sessions[tId].urac.socialLogin){
        	urac.socialLogin = {
		        "strategy": this.session.sessions[tId].urac.socialLogin.strategy,
		        "id": this.session.sessions[tId].urac.socialLogin.id
	        };
        }
        
        if (_ALL) {
        	if(this.session.sessions[tId].urac.socialLogin){
		        urac.socialLogin.accessToken = this.session.sessions[tId].urac.socialLogin.accessToken;
	        }
        	
            urac.config = this.session.sessions[tId].urac.config;
        }
    }
    return urac;
};

/**
 *
 * @returns {*}
 */
MultiTenantSession.prototype.getGroups = function () {
    var tId = this.session.persistSession.holder.tenant.id;
    if (!this.session.sessions[tId].urac) {
        return null;
    }
    var groups = null;
    if (this.session.sessions[tId].urac.groups) {
        groups = this.session.sessions[tId].urac.groups;
    }
    return groups;
};


module.exports = MultiTenantSession;

