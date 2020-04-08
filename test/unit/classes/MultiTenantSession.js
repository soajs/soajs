"use strict";
/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */

const helper = require("../../helper.js");

const multiTenantSessionObj = helper.requireModule('./classes/MultiTenantSession');

describe("Unit test for: classes MultiTenantSession", function () {
	
	it("preserveTenantSession", function (done) {
		let multiTenantSession = new multiTenantSessionObj({
			"tenant": {
				id: "123",
				key: "123"
			},
			"session": {
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
			}
		});
		
		multiTenantSession.preserveTenantSession();
		
		done();
	});
	
	it("setPersistSessionSTATE", function (done) {
		let multiTenantSession = new multiTenantSessionObj({
			"tenant": {
				id: "123",
				key: "123"
			},
			"session": {
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
			}
		});
		multiTenantSession.session = {};
		multiTenantSession.setPersistSessionSTATE();
		done();
	});
	
	it("setPersistSessionHOLDER", function (done) {
		let multiTenantSession = new multiTenantSessionObj({
			"tenant": {
				id: "123",
				key: "123"
			},
			"session": {
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
			}
		});
		multiTenantSession.session = {};
		multiTenantSession.setPersistSessionHOLDER();
		done();
	});
	
	it("deleteTenantSession", function (done) {
		let multiTenantSession = new multiTenantSessionObj({
			"tenant": {
				id: "123",
				key: "123"
			},
			"session": {
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
			},
			"req": {
				sessionStore: {
					set: function (sessionID, session, cb) {
						return cb("output");
					}
				}
			}
		});
		
		
		multiTenantSession.deleteTenantSession(function () {
			done();
		});
	});
	
	it("setSERVICE & getSERVICE", function (done) {
		let multiTenantSession = new multiTenantSessionObj({
			"tenant": {
				id: "123",
				key: "123"
			},
			"request":{
				"service":"urac"
			},
			"session": {
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
			},
			"req": {
				sessionStore: {
					set: function (sessionID, session, cb) {
						return cb("output");
					}
				}
			}
		});
		
		
		multiTenantSession.setSERVICE({"a":"b"}, function () {
			multiTenantSession.getSERVICE();
			done();
		});
	});
});