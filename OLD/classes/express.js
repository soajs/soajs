var express = require('express');

/**
 *
 * @param _method
 * @returns {Function}
 */
function soajsWapper(_method) {
    return function () {
        var jsonObj = null;
        var soajsAuth = null;

        if (typeof arguments[0] === "object")
            jsonObj = arguments[0];
        else if (typeof arguments[1] === "object")
            jsonObj = arguments[1];
        if (jsonObj && jsonObj.result === false) {
            if (!this.statusCode || (this.statusCode && this.statusCode === 200)) {
                this.statusCode = 500;
            }
        }
        if (jsonObj)
            soajsAuth = this.get("soajsauth");
        if (soajsAuth)
            jsonObj.soajsauth = soajsAuth;

        return _method.apply(this, arguments);
    };
}

express.response.json = soajsWapper(express.response.json);
express.response.jsonp = soajsWapper(express.response.jsonp);


module.exports = express;