'use strict';


/**
 *
 * @param configuration
 * @returns {Function}
 */
module.exports = function (configuration) {

    return function (req, res, next) {
        req.get = function (name) {
            if (!name) {
                throw new TypeError('name argument is required to req.get');
            }

            if (typeof name !== 'string') {
                throw new TypeError('name must be a string to req.get');
            }

            var lc = name.toLowerCase();

            switch (lc) {
                case 'referer':
                case 'referrer':
                    return req.headers.referrer
                        || req.headers.referer;
                default:
                    return req.headers[lc];
            }
        };
        next();
    };
};
