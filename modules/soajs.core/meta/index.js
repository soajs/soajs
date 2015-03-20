"use strict";
module.exports = {
	tenantDB: function(metaDB, systemName, tenantCode) {
		var dbConfig = {};
		if(tenantCode && systemName && metaDB && metaDB[systemName] && metaDB[systemName].name) {
			dbConfig = {
				"name": metaDB[systemName].name.replace('#TENANT_NAME#', tenantCode),
				"prefix": metaDB[systemName].prefix,
				"servers": metaDB[systemName].servers,
				"credentials": metaDB[systemName].credentials,
				"URLParam": metaDB[systemName].URLParam,
				"extraParam": metaDB[systemName].extraParam
			};
		}
		return dbConfig;
	}
};