"use strict";

/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */


const helper = require("../../helper.js");
const soajs = helper.requireModule('./index.js');
const config = require('./config.js');

let daemon = new soajs.server.daemon({"config": config});

daemon.init(function () {
    daemon.job("hello", function (soajs, next) {
        soajs.log.info("HELLO daemon");
       
        next();
    });
    daemon.start();
});