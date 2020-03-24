'use strict';
var url = require('url');
var coreModules = require("soajs.core.modules");
var provision = coreModules.provision;
var coreLibs = require("soajs.core.libs");

var regEnvironment = (process.env.SOAJS_ENV || "dev");
regEnvironment = regEnvironment.toLowerCase();

let filterOutRegExpObj = require("./apiPathParam2apiRegExp.js");
/**
 *
 * @param configuration
 * @returns {Function}
 */
module.exports = function (configuration) {

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
                    !Object.hasOwnProperty.call(aclObj, 'apisPermission') &&
                    Object.keys(aclObj).length) {
                    if (obj.service_v) {
                        let san_v = coreLibs.version.sanitize(obj.service_v);
                        if (!aclObj[san_v])
                            return cb(154, null);
                        aclObj = aclObj[san_v];
                    }
                    else {
                        //try to get latest version from ACL
                        if (aclObj) {
                            let version = null;
                            for (let v in aclObj) {
                                version = coreLibs.version.getLatest(version, v);
                            }
                            if (version) {
                                obj.req.soajs.controller.serviceParams.service_v = coreLibs.version.unsanitize(version);
                                //if (!aclObj[version])
                                //    return cb(154, null);
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
        if (!req.query && parsedUrl.query) {
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

        var key = req.headers.key || parsedUrl.query.key;
        if (!req.headers.key) {
            req.headers.key = key;
        }

        if (!req.query.access_token && req.headers.access_token) {
            req.query.access_token = req.headers.access_token;
        }

        req.soajs.controller.serviceParams = {
            "parsedUrl": parsedUrl,
            "serviceInfo": serviceInfo,
            "service_n": service_n,
            "service_nv": service_nv,
            "service_v": service_v,
            "name": service_n
        };

        if (!key)
            return next();

        provision.getExternalKeyData(key, req.soajs.registry.serviceConfig.key, function (err, keyObj) {
            if (err) {
                req.soajs.log.error(err);
                return next();
            }
            if (!keyObj)
                return next(148);

            req.soajs.controller.serviceParams.keyObj = keyObj;
            if (keyObj && keyObj.application && keyObj.application.package) {
                if (keyObj.env) {
                    let keyEnv = keyObj.env.toLowerCase();
                    if (keyEnv !== regEnvironment) {
                        return next(144);
                    }
                }
                // req.soajs.tenant = keyObj.tenant;
                // req.soajs.tenant.key = {
                //     "iKey": keyObj.key,
                //     "eKey": keyObj.extKey
                // };
                provision.getPackageData(keyObj.application.package, function (err, packObj) {
                    if (err)
                        return next();
                    if (!packObj)
                        return next(149);

                    req.soajs.controller.serviceParams.packObj = packObj;
                    aclCheck({
                        "req": req,
                        "keyObj": keyObj,
                        "packObj": packObj,
                        "service_v": service_v
                    }, (err, finalAcl) => {
                        if (err)
                            return next(err);

                        //this is the finalACL without versions
                        req.soajs.controller.serviceParams.finalAcl = finalAcl;

                        return next()
                    });
                });
            }
            else
                return next();
        });
    };
};