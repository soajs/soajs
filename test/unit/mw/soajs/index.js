"use strict";

const helper = require("../../../helper.js");
const mw = helper.requireModule('./mw/soajs/index');

describe("Unit test for: mw - soajs", function () {
    let req = {};
    let res = {};
    let core = {
        "registry": {
            "get": () => {
            }
        },
        "meta": "",
        "validator": ""
    };
    let log = {};

    it("Install & Use the MW", function (done) {
        let mw_use = mw({"log": log, "core": core});
        mw_use(req, res, () => {
            done();
        });
    });
});