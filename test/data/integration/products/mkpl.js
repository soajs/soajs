'use strict';
let prod = {
	_id: "5e398cd379a7190c2670722a",
	code: "MKPLC",
	description: "This product is the market place public product",
	name: "Marketplace",
	packages: [
		{
			code: "MKPLC_GUEST",
			name: "Guest",
			locked: true,
			description: "This is the default mkpl",
			acl: {
				dashboard: {
					marketplace: [
						{
							version: "1"
						}
					]
				}
			},
			_TTL: 604800000
		}
	],
	scope: {
		acl: {
			dashboard: {
				marketplace: {
					"1": {
						access: false
					}
				}
			}
		}
	}
};

module.exports = prod;