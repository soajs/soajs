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
                return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiZ2FicmllbEByb2Nrc3Bvb24uY29tIn0.wrcN9K6sLGHjigGHo1nw6tBWA5HOWTLTmB_ywTf2quM";
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
                return "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiZ2FicmllbEByb2Nrc3Bvb24uY29tIn0.wrcN9K6sLGHjigGHo1nw6tBWA5HOWTLTmB_ywTf2wed";
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
                return "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiZ2FicmllbEByb2Nrc3Bvb24uY29tIn0.wrcN9K6sLGHjigGHo1nw6tBWA5HOWTLTmB_ywTf2quM";
        };
        let functionMw = index(configuration);
        functionMw(req, res, (error) =>{
            assert.ok(req.oauth);
            assert.ok(req.oauth.bearerToken);
            done();
        });
    });

});