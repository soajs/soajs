'use strict';

module.exports = function(ObjectId){
        return({
        "_id": new ObjectId("50d2cb5fc04ce51e06000001"),
        "code" : "TPROD",
        "name" : "Test Product",
        "description" : "this is a description for test product",
        "packages" : [
            {
                "code" : "TPROD_BASIC",
                "name" : "basic package",
                "description" : "this is a description for test product basic package",
                "acl" : {
                    "urac" : {}
                },
                "_TTL" : 86400000 // 24 hours
            },
            {
                "code" : "TPROD_EXAMPLE03",
                "name" : "example03 package",
                "description" : "this is a description for test product example03 package",
                "acl" : {
                    "urac" : {},
                    "example03" : {
	                    "access":true
                    }
                },
                "_TTL" : 86400000 // 24 hours
            }
        ]
    });
};