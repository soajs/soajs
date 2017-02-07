'use strict';

module.exports = {
    'errors': {
        '100': 'The provided key does not have the right number of characters.',
        '101': 'Problem with the length of the key.',
        '102': 'Log & Registry are needed for any service to function.',
        '103': 'The length of the generate ext key is bad.',

        '13x': "CONTROLLER",
        '130': "Unknown service.",
        '131': "Controller mw requires configuration to be the first param.",
        '132': "A valid key is needed to access any API.",
        '133': "The service you are trying to reach is not reachable at this moment.",
        '134': "All requests to the service you are trying to reach are timing out.",
        '135': "Error occurred while redirecting your request to the service",
        '136': "Controller catched an error while redirecting to service.",

        '14x': "SERVICE CORE",
        '141': "Unable to start the service.",
        '150': "Something blew up @ service core!",
        '151': "You are trying to reach an unknown rest service!",
        '152': "Unable to load you product package information. Check provision configuration for this key.",
        '153': "Unable to load provision information for the provided key.",
        '154': "Access denied: The service is not available in your current package.",
        '155': "Geographic location forbidden",
        '156': "Device forbidden",
        '157': "You do not belong to a group with access to this System.",
        '158': "You need to be logged in to access this System.",
        '159': "System api access is restricted. api is not in provision.",
        '160': "You do not belong to a group with access to this system API.",
        '161': "You need to be logged in to access this API.",
        '162': "Unable to initialize the multi tenant session.",
        '163': "Error in persisting the session",
        '164': "Unknown error @ rest core!",
        '165': "Roaming: Unable to login roamed user!",
        '166': "Roaming: Something blew up @ service core!",
        '167': "Roaming: Unable to load you product package information. Check provision configuration for this key.",
        '168': "Roaming: Unable to load provision information for the provided key.",
        '169': "Roaming: Unable to find any logged in user to roam!",
        '170': "Roaming: Unable to load registry for roam to env",

        '17x': "INPUTMASK",

        '19x': "MONGO",
        '190': 'Unable to build needed url for mongo to connect.',
        '191': 'collection name is required.',
        "192": "Invalid record provided to Mongo",
        "193": "Unable to find the record to version it",
        "194": "Invalid record version provided to Mongo",
        "195": "Invalid DB Config. please send a valid DB config to MongoDriver's constructor",
        "196": "Invalid ES Config. please send a valid ES config to ESDriver's constructor",

        '20x': "PROVISION",
        '200': 'You need to provide an external key.',
        '201': 'You need to provide a package code.',
        '202': 'Unable to load tenant keys data.',
        '203': 'Unable to generate external key from provided key.',
        '204': 'Unable to generate internal key.',
        '205': 'You need to provide a tenant ID.',
        '206': "Unable to load provision information for the provided tenant ID."
    }
};