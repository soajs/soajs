'use strict';

const coreLibs = require("soajs.core.libs");

/**
 * loops inside ACL object and moves routes that contain path params from api to apiRegExp
 * @param {Object} originalAclObj
 */
module.exports = (originalAclObj) => {

    let aclObj = null;
    if (originalAclObj)
        aclObj = coreLibs.utils.cloneObj(originalAclObj);

    /**
     * changes all tokens found in url with a regular expression
     * @param {String} route
     * @returns {RegExp}
     */
    function constructRegExp(route) {
        let pathToRegexp = require('path-to-regexp');
        let keys = [];
        let out = pathToRegexp(route, keys, {sensitive: true});
        if (out && out.keys && out.keys.length > 0) {
            out = new RegExp(out.toString());
        }
        return out;
    }

    /**
     * check if the given route contains the path param attribute "/:"
     * @param {String} route
     * @returns {boolean}
     */
    function isAttributeRoute(route) {
        return route.includes("/:");
    }

    /**
     * recursively loop in acl object,
     * fetch each entry and its sub entries
     * detected matched and replace their apis entreis with regexp entries
     *
     * @param {object} ancestor
     * @param {object} object
     * @param {string} currentSub
     */
    function fetchSubObjectsAndReplace(ancestor, object, currentSub) {

        let current = (currentSub) ? object[currentSub] : object;

        /**
         * if current entry is an object and object has properties and property neither the first nor the last child in object
         * recursively loop on this child
         */
        let siblings = Object.keys(object);
        if (currentSub && siblings.indexOf(currentSub) !== (siblings.length - 1)) {
            fetchSubObjectsAndReplace(ancestor, object, siblings[siblings.indexOf(currentSub) + 1]);
        }

        /**
         * if current entry is an object and object has properties
         * recursively loop on first child in object
         */
        if (typeof current === 'object') {
            let subObjects = Object.keys(current);
            if (subObjects.length > 0) {
                fetchSubObjectsAndReplace(object, current, subObjects[0]);
            }
        }

        /**
         * if the the route has an attribute
         * copy all the info of apis[route]
         * create a new entry from copied information and push it to apisRegExp
         */
        if (currentSub && isAttributeRoute(currentSub)) {

            let oldCurrentSub = currentSub;

            if (!ancestor.apisRegExp) {
                ancestor.apisRegExp = [];
            }

            let regExp = constructRegExp(currentSub);
            let obj = object[oldCurrentSub];
            obj.regExp = regExp;
            ancestor.apisRegExp.push(obj);

            delete object[oldCurrentSub];
        }
    }

    if (aclObj && typeof aclObj === 'object' && Object.keys(aclObj).length > 0) {
        fetchSubObjectsAndReplace(null, aclObj, null);
    }

    return aclObj;
};