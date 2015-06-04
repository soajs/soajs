'use strict';
var core = require("../soajs.core");

function ContentBuilder(config) {
    core.registry.profile(function (registry) {
        if (registry)
            console.log (registry.coreDB.provision);
    });
}

module.exports = ContentBuilder;