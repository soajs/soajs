
/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */

"use strict";

module.exports = {
    requireModule: function (path) {
        return require((process.env.APP_DIR_FOR_CODE_COVERAGE || '../') + path);
    }
};