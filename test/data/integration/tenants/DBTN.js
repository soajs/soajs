'use strict';
let lib = {
    _id: "5c0e74ba9acc3c5a84a51259",
    type: "product",
    code: "DBTN",
    profile: {
        fabio: "cuba"
    },
    locked: true,
    name: "Console Tenant",
    description: "This is the tenant that holds the access rights and configuration for the console users with DSBRD_GUEST as Guest default package",
    oauth: {
        secret: "this is a secret",
        disabled: 0,
        type: 2,
        loginMode: "urac"
    },
    applications: [
        {
            product: "DSBRD",
            package: "DSBRD_GUEST",
            appId: "5c0e74ba9acc3c5a84a5125a",
            description: "Dashboard application for DSBRD_GUEST package",
            _TTL: 604800000,
            keys: [
                {
                    key: "a139786a6e6d18e48b4987e83789430b",
                    extKeys: [
                        {
                            extKey: "3d90163cf9d6b3076ad26aa5ed58556348069258e5c6c941ee0f18448b570ad1c5c790e2d2a1989680c55f4904e2005ff5f8e71606e4aa641e67882f4210ebbc5460ff305dcb36e6ec2a2299cf0448ef60b9e38f41950ec251c1cf41f05f3ce9",
                            device: null,
                            geo: null,
                            env: "DASHBOARD",
                            expDate: null,
                            dashboardAccess: true
                        }
                    ],
                    config: {
                        dashboard: {
                        }
                    }
                }
            ]
        },
	    {
		    product: "MKPLC",
		    package: "MKPLC_GUEST",
		    appId: "5de650c3af78152c3304f750",
		    description: "Marketplace",
		    _TTL: 604800000,
		    keys: [
			    {
				    key: "b8fbdd5bf82640d4ba9a17a41ca87436",
				    extKeys: [
					    {
						    extKey: "3d90163cf9d6b3076ad26aa5ed5855639bd27317e5b63490ccc982c32e15a491dd4cbd37804bd535c6dd753a5e2d299588d2add494838aecd42edb8a727113d1d4d98e06d373ce769657a6d64736deba6fb9b58ec10d4fc7e29837f137323a32",
						    device: null,
						    geo: null,
						    env: "DASHBOARD",
						    expDate: null,
						    dashboardAccess: true
					    }
				    ],
				    config: {
					    dashboard: {
					    }
				    }
			    }
		    ]
	    }
    ],
    tag: "Console",
    console: true
};

module.exports = lib;
