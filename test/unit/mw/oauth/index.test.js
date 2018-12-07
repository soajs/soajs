"use strict";
var assert = require("assert");
var helper = require("../../../helper.js");
var coreModules = require("soajs.core.modules");
var core = coreModules.core;
var provision = coreModules.provision;

var index = helper.requireModule('./mw/oauth/index.js');

describe("Testing oauth MW", function () {

    let configuration = {
        "soajs": {
            "param": {}
        },
        "serviceConfig": {
            "oauth": {
                "grants": [
                    "password",
                    "refresh_token"
                ],
                "debug": false,
                "accessTokenLifetime": 7200,
                "refreshTokenLifetime": 1209600
            }
        },
        "model": provision.oauthModel
    };
    let req = {
        "soajs": {
            "tenantOauth": {
                "type": 0,
                "secret" : "shhh this is a secret"
            },
            "servicesConfig": {},
            "registry": {
                "serviceConfig": {
                    "oauth": {
                        "secret" : "your-256-bit-secret",
                        "type" : 0,
                        "algorithms" : [
                            "HS256"
                        ]
                    }
                }
            }
        },
        "get" : (what)=> {
            return null;
        }
    };
    let res = {};

    it("test oauth MW - initialize", function (done) {
        let functionMw = index(configuration);
        assert.ok(configuration.soajs.oauthService);
        done();
    });

    it("test  oauth MW - without Authorization", function (done) {
        let functionMw = index(configuration);
        functionMw(req, res, (error) =>{
            assert.deepEqual(error, 143);
            done();
        });
    });

    it("test  oauth MW - with wrong Authorization syntax", function (done) {
        req.get = (what) => {
            if ('Authorization' === what)
                return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmb28iOiJiYXIiLCJpYXQiOjE1NDQxMzg5NjV9.gOCtYwG2QdamGbFe-33ffBz9dkoRn_nEiGf0BAuRAz8";
        };
        let functionMw = index(configuration);
        functionMw(req, res, (error) =>{
            assert.deepEqual(error, 143);
            done();
        });
    });

    it("test  oauth MW - with wrong Authorization", function (done) {
        req.get = (what) => {
            if ('Authorization' === what)
                return "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmb28iOiJiYXIiLCJpYXQiOjE1NDQxMzg5NjV9.gOCtYwG2QdamGbFe-33ffBz9dkoRn_nEiGf0BAuRAz0";
        };
        let functionMw = index(configuration);
        functionMw(req, res, (error) =>{
            console.log(error);
            assert.ok(error);
            done();
        });
    });

    it("test  oauth MW - good Authorization", function (done) {
        req.get = (what) => {
            if ('Authorization' === what)
                return "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmb28iOiJiYXIiLCJpYXQiOjE1NDQxMzg5NjV9.gOCtYwG2QdamGbFe-33ffBz9dkoRn_nEiGf0BAuRAz8";
        };
        let functionMw = index(configuration);
        functionMw(req, res, (error) =>{
            assert.ok(req.oauth);
            assert.ok(req.oauth.bearerToken);
            done();
        });
    });

});