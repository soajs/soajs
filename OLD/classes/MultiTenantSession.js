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

module.exports = MultiTenantSession;

