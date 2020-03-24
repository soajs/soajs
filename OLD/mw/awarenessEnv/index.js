/**
 *
 * @param param
 * @returns {Function}
 */
module.exports = {
	getMw: function (param) {
		var roundRobin = null;
		var driver = null;
		if (param.awarenessEnv) {
			if (!process.env.SOAJS_DEPLOY_HA) {
				driver = require("./custom.js");
				driver.init(param);
			}
			else {
				driver = require("./ha.js");
				driver.init(param);
			}
		}
		return function (req, res, next) {
			if (param.awarenessEnv) {
				req.soajs.awarenessEnv = {
					"getHost": driver.getControllerEnvHost
				};
			}
			next();
		}
	}
};