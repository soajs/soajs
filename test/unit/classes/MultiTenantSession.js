"use strict";
/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */

const helper = require("../../helper.js");

const multiTenantSession = helper.requireModule('./classes/MultiTenantSession');

describe("Unit test for: classes MultiTenantSession", function () {
	
	it("preserveTenantSession", function (done) {
		multiTenantSession.prototype.session = {
			persistSession: {
				holder: {
					tenant: {
						id: "123",
						key: "123"
					}
				}
			},
			sessions: {
				"123": {
					keys: ["key1"]
				},
				"321": {}
			}
		};
		
		multiTenantSession.prototype.preserveTenantSession();
		
		done();
	});
	
	it("setPersistSessionSTATE", function (done) {
		multiTenantSession.prototype.session = {};
		multiTenantSession.prototype.setPersistSessionSTATE();
		done();
	});
	
	it("setPersistSessionHOLDER", function (done) {
		multiTenantSession.prototype.session = {};
		multiTenantSession.prototype.setPersistSessionHOLDER();
		done();
	});
	
	it("deleteTenantSession", function (done) {
		
		multiTenantSession.prototype.req = {
			sessionStore: {
				set: function (sessionID, session, cb) {
					return cb("output");
				}
			}
		};
		
		multiTenantSession.prototype.session = {
			persistSession: {
				holder: {
					tenant: {
						id: "123",
						key: "123"
					}
				}
			},
			sessions: {
				"123": {
					keys: ["key1"]
				},
				"321": {}
			}
		};
		multiTenantSession.prototype.deleteTenantSession(function () {
			done();
		});
	});
	
	
});