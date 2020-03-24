'use strict';

let group = {
    _id: "5c8d0c505653de3985aa0ffe",
    locked: true,
    code: "owner",
    name: "Owner Group",
    description: "this is the owner group that owns the dashboard",
    config: {
        allowedPackages: {
            DSBRD: [
                "DSBRD_OWNER"
            ]
        }
    },
    tenant: {
        id: "5c0e74ba9acc3c5a84a51259",
        code: "DBTN"
    }
};

module.exports = group;