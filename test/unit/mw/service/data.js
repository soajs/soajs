"use strict";
/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */

module.exports = {
	"soajs": {
		"log": {
			"error": function (err) {
				console.log(err);
			},
			"warn": function (err) {
				console.log(err);
			},
			"debug": function (msg) {
				console.log(msg);
			}
		},
		"registry": {
			"services": {
				"controller": {
					"name": "controller"
				}
			}
		}
	},
	"headers": {
		"x-forwarded-proto": "http",
		"host": "dashboard-api.soajs.org",
		"x-nginx-proxy": "true",
		"content-length": "66",
		"accept": "*/*",
		"origin": "http://dashboard.soajs.org",
		"authorization": "Basic NTU1MWFjYTllMTc5YzM5Yjc2MGY3YTFhOnNoaGggdGhpcyBpcyBhIHNlY3JldA==",
		"key": "d44dfaaf1a3ba93adc6b3368816188f96134dfedec7072542eb3d84ec3e3d260f639954b8c0bc51e742c1dff3f80710e3e728edb004dce78d82d7ecd5e17e88c39fef78aa29aa2ed19ed0ca9011d75d9fc441a3c59845ebcf11f9393d5962549",
		"user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.101 Safari/537.36",
		"content-type": "application/json",
		"referer": "http://dashboard.soajs.org/",
		"accept-encoding": "gzip, deflate",
		"accept-language": "en-US,en;q=0.8,ar;q=0.6",
		"soajsinjectobj": "{\"tenant\":{\"id\":\"5551aca9e179c39b760f7a1a\",\"code\":\"DBTN\"},\"key\":{\"config\":{\"mail\":{\"from\":\"soajstest@soajs.org\",\"transport\":{\"type\":\"smtp\",\"options\":{\"host\":\"secure.emailsrvr.com\",\"port\":\"587\",\"ignoreTLS\":true,\"secure\":false,\"auth\":{\"user\":\"soajstest@soajs.org\",\"pass\":\"p@ssw0rd\"}}}},\"oauth\":{\"loginMode\":\"urac\"}},\"iKey\":\"38145c67717c73d3febd16df38abf311\",\"eKey\":\"d44dfaaf1a3ba93adc6b3368816188f96134dfedec7072542eb3d84ec3e3d260f639954b8c0bc51e742c1dff3f80710e3e728edb004dce78d82d7ecd5e17e88c39fef78aa29aa2ed19ed0ca9011d75d9fc441a3c59845ebcf11f9393d5962549\"},\"application\":{\"product\":\"DSBRD\",\"package\":\"DSBRD_MAIN\",\"appId\":\"5512926a7a1f0e2123f638de\"},\"package\":{},\"device\":\"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.101 Safari/537.36\",\"geo\":{\"ip\":\"127.0.0.1\"},\"awareness\":{\"host\":\"127.0.0.1\",\"port\":4000,\"interConnect\":[{\"name\":\"urac\",\"version\":\"3\",\"host\":\"127.0.0.2\",\"port\":4001,\"latest\":\"3\"}]},\"urac\":{\"_id\": \"59a538becc083eecf37149df\", \"username\": \"owner\", \"firstName\": \"owner\", \"lastName\": \"owner\", \"email\": \"owner@soajs.org\", \"groups\": [ \"owner\" ], \"tenant\": { \"id\":\"5551aca9e179c39b760f7a1a\", \"code\": \"DBTN\" },\"profile\": {},\"acl\": null, \"acl_AllEnv\": null},\"param\":{\"id\":\"5551aca9e179c39b760f7a1a\"}}",
		"cookie": "",
		"connection": "close"
	},
	"query": {
		"access_token": "TOKEN"
	}
};