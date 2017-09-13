"use strict";
var assert = require("assert");
var daemon = require("./../../../servers/daemon");

var config = {
	"type": "daemon",
	"dbs": [
		{
			prefix: "",
			name: "test",
			multitenant: false
		}
	],
	serviceVersion: 1,
	serviceName: "cleanerz",
	serviceGroup: "test",
	servicePort: 4555,
	prerequisites: {
		cpu: '',
		memory: ''
	},
	"errors": {},
	"schema": {
		"cleanVersions": {
			"l": "BlackList Check and Version Cleaning Daemon"
		},
		"resetHeadings": {
			"l": "Reset Headings"
		}
	}
};

var soajsCore = require("soajs");

var daemonDriver = new soajsCore.server.daemon(config);

describe("Testing Daemon", function () {
	
	it("init - xxx ", function (done) {
		
		daemonDriver.init(function () {
			
			daemonDriver.job('cleanVersions', function (soajs, next) {
				console.log("workinggg");
			});
			
			daemonDriver.job('resetHeadings', function (soajs, next) {
				console.log("workinggg 2");
			});
			
			daemonDriver.start();
			done();
		});
	});
	
});