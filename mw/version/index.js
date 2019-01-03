'use strict';
var url = require('url');
var coreModules = require("soajs.core.modules");
var provision = coreModules.provision;
var coreLibs = require("soajs.core.libs");

var regEnvironment = (process.env.SOAJS_ENV || "dev");
regEnvironment = regEnvironment.toLowerCase();

/**
 *
 * @param configuration
 * @returns {Function}
 */
module.exports = function (configuration) {

    /**
     * loops inside ACL object and moves routes that contain path params from api to apiRegExp
     * @param {Object} originalAclObj
     */
    let filterOutRegExpObj = (originalAclObj) => {

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

    // obj {req, keyObj, packObj}
    let aclCheck = (obj, cb) => {
        let aclObj = null;
        let finalAcl = null;

        if (!aclObj && obj.keyObj.application.acl) {
            obj.req.soajs.log.debug("Found ACL at Tenant Application level, overriding default ACL configuration.");
            aclObj = obj.keyObj.application.acl[obj.req.soajs.controller.serviceParams.name];
        }
        if (!aclObj && obj.packObj.acl) {
            obj.req.soajs.log.debug("Found Default ACL at Package level, setting default ACL configuration.");
            aclObj = obj.packObj.acl[obj.req.soajs.controller.serviceParams.name];
        }

        if (aclObj && (aclObj.apis || aclObj.apisRegExp)) {
            obj.req.soajs.log.debug("Detected old schema ACL Configuration ...");
            finalAcl = filterOutRegExpObj(aclObj);
        }
        else {
            obj.req.soajs.log.debug("Detected new schema ACL Configuration using http methods ...");

            if (aclObj) {
                //check if acl has version schema
                if (!Object.hasOwnProperty.call(aclObj, 'access') &&
                    !Object.hasOwnProperty.call(aclObj, 'apis') &&
                    !Object.hasOwnProperty.call(aclObj, 'apisRegExp') &&
                    !Object.hasOwnProperty.call(aclObj, 'apisPermission')) {
                    if (obj.service_v) {
                        if (!aclObj[obj.service_v])
                            return (154, null);
                        aclObj = aclObj[obj.service_v];
                    }
                    else {
                        //try to get latest version from ACL
                        if (aclObj) {
                            let version = null;
                            for (let v in aclObj) {
                                version = coreLibs.version.getLatest(version, v);
                            }
                            if (version) {
                                obj.req.soajs.controller.serviceParams.service_v = version;
                                if (!aclObj[version])
                                    return (154, null);
                                aclObj = aclObj[version];
                            }
                        }
                    }
                }
            }

            //ACL with method support restful
            let method = obj.req.method.toLocaleLowerCase();
            if (aclObj && aclObj[method] && typeof aclObj[method] === "object") {
                let newAclObj = {};
                if (aclObj.hasOwnProperty('access'))
                    newAclObj.access = aclObj.access;
                if (aclObj[method].hasOwnProperty('apis'))
                    newAclObj.apis = aclObj[method].apis;
                if (aclObj[method].hasOwnProperty('apisRegExp'))
                    newAclObj.apisRegExp = aclObj[method].apisRegExp;
                if (aclObj[method].hasOwnProperty('apisPermission'))
                    newAclObj.apisPermission = aclObj[method].apisPermission;
                else if (aclObj.hasOwnProperty('apisPermission'))
                    newAclObj.apisPermission = aclObj.apisPermission;

                finalAcl = filterOutRegExpObj(newAclObj);
            }
            else {
                finalAcl = filterOutRegExpObj(aclObj);
            }
        }
        return cb(null, finalAcl);
    };

    return function (req, res, next) {
        if (!req.soajs) {
            throw new TypeError('soajs mw is not started');
        }

        if (!req.soajs.controller) {
            req.soajs.controller = {};
        }

        let parsedUrl = url.parse(req.url, true);
        if (!req.query && parsedUrl.query && parsedUrl.query.access_token) {
            req.query = parsedUrl.query;
        }

        if (!req.query) {
            req.query = {};
        }

        let serviceInfo = parsedUrl.pathname.split('/');
        let service_nv = serviceInfo[1];
        let service_n = service_nv;
        let service_v = null;

        //check if there is /v1 or v1.1 in the url
        let matches = req.url.match(/\/v[0-9]+(.[0-9]+)?\//);
        if (matches && matches.length > 0) {
            let hit = matches[0].replace(/\//g, '');
            if (serviceInfo[2] === hit && serviceInfo.length > 3) {
                service_v = hit.replace("v", '');
                serviceInfo.splice(2, 1);
                req.url = req.url.replace(matches[0], "/");
                parsedUrl = url.parse(req.url, true);
            }
        }

        //check if there is service:1 or :1.1 in the url
        if (!service_v) {
            let index = service_nv.indexOf(":");
            if (index !== -1) {
                matches = service_nv.match(/:[0-9]+(.[0-9]+)?/);
                if (matches && matches.length > 0) {
                    service_v = service_nv.substr(index + 1);
                }
                service_n = service_nv.substr(0, index);
            }
        }

        req.soajs.controller.serviceParams = {
            "parsedUrl": parsedUrl,
            "serviceInfo": serviceInfo,
            "service_n": service_n,
            "service_nv": service_nv,
            "service_v": service_v,
            "name": service_n
        };

        provision.getExternalKeyData(req.get("key"), req.soajs.registry.serviceConfig.key, function (err, keyObj) {
            if (err)
                return next();

                req.soajs.controller.serviceParams.keyObj = keyObj;
                if (keyObj && keyObj.application && keyObj.application.package) {
                    if (keyObj.env) {
                        let keyEnv = keyObj.env.toLowerCase();
                        if (keyEnv !== regEnvironment){
                            return next (144);
                        }
                    }
                   // req.soajs.tenant = keyObj.tenant;
                   // req.soajs.tenant.key = {
                   //     "iKey": keyObj.key,
                   //     "eKey": keyObj.extKey
                   // };
                    provision.getPackageData(keyObj.application.package, function (err, packObj) {
                        if (err)
                            return next ();

                            req.soajs.controller.serviceParams.packObj = packObj;
                            aclCheck({"req": req, "keyObj": keyObj, "packObj": packObj, "service_v": service_v}, (err, finalAcl) => {
                                if (err)
                                    return next (err);

                                    //this is the finalACL without versions
                                    req.soajs.controller.serviceParams.finalAcl = finalAcl;

                                    return next ()
                            });
                    });
                }
                else
                    return next();
        });
    };
};