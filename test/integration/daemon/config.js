"use strict";

/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */


module.exports = {
	"type": "mdaemon",
    "serviceName": "helloDaemon",
    "servicePort": 4200,
    "awarenessEnv" : true,
    "errors": {},
    "schema": {
        "hello": {
            "l": "hello world"
        }
    }
};