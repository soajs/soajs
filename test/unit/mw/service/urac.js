"use strict";
/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */

const helper = require("../../../helper.js");
const UracDriver = helper.requireModule('./mw/service/urac.js');
const assert = require('assert');

describe("Unit test for: mw - mt URAC", () => {
	let user = {
		"_id": '5c8d0c505653de3985aa0ffd',
		"username": 'owner',
		"firstName": 'owner',
		"lastName": 'owner',
		"email": 'me@localhost.com',
		"groups": ['owner'],
		"groupsConfig": {
			"allowedPackages": {
				"DSBRD": [
					"DSBRD_OWNER"
				]
			}
		},
		"profile": {},
		"config": {
			"packages": {},
			"keys": {}
		},
		"tenant": {"id": '5c0e74ba9acc3c5a84a51259', "code": 'DBTN'}
	};
	let userACL = {
		"acl": {}
	};
	
	describe("Vanilla test for: mw - mt URAC", () => {
		let uracDriver = new UracDriver();
		uracDriver.userRecord = user;
		uracDriver.user_ACL = userACL;
		
		it("test init", (done) => {
			uracDriver.init((error, uracProfile) => {
				assert.deepEqual(uracProfile, user);
				done();
			});
		});
		it("test getProfile", (done) => {
			let p = uracDriver.getProfile();
			assert.deepEqual(p,
				{
					_id: '5c8d0c505653de3985aa0ffd',
					username: 'owner',
					firstName: 'owner',
					lastName: 'owner',
					email: 'me@localhost.com',
					groups: ['owner'],
					profile: {},
					tenant: {id: '5c0e74ba9acc3c5a84a51259', code: 'DBTN'}
				});
			done();
		});
		it("test getAcl", (done) => {
			let a = uracDriver.getAcl();
			assert.ok(a);
			done();
		});
		it("test getGroups", (done) => {
			let g = uracDriver.getGroups();
			assert.deepEqual(g, ['owner']);
			done();
		});
	});
});