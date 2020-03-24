'use strict';

let token = {
	_id: "5cdc190fd52c82e0ddb1dcd6",
	type: "refreshToken",
	token: "ddfd5eb42417b480471b4cec06381244658ffc7a",
	clientId: "5c0e74ba9acc3c5a84a51259",
	user: {
		_id: "5c8d0c505653de3985aa0ffd",
		username: "owner",
		password: "$2a$12$geJJfv33wkYIXEAlDkeeuOgiQ6y6MjP/YxbqLdHdDSK7LDG.7n7Pq",
		firstName: "owner3",
		lastName: "owner",
		email: "me@localhost.com",
		status: "active",
		config: {},
		"ts": new Date().getTime(),
		tenant: {
			id: "5c0e74ba9acc3c5a84a51259",
			code: "DBTN"
		},
		groups: ["owner"],
		lastLogin: new Date().getTime(),
		groupsConfig: {
			allowedPackages: {
				DSBRD: [
					"DSBRD_OWNER"
				]
			}
		},
		loginMode: "urac",
		id: "5c8d0c505653de3985aa0ffd"
	},
	env: "dashboard",
	expires: new Date((new Date().getFullYear()) + 3, 0, 1)
};

module.exports = token;