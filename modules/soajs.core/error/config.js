'use strict';

module.exports = {
	'errors': {
		'100': 'The provided key does not have the right number of characters.',
		'101': 'Problem with the length of the key.',
		'102': 'Log & Registry are needed for any service to function.',
		'103': 'The length of the generate ext key is bad.',

		'13x': "REST MANAGER",
		'130': "Unknown service.",
		'131': "RM mw requires configuration to be the first param.",
		'132': "A valid key is needed to access any API.",
		'133': "The service you are trying to reach is not reachable at this moment.",
		'134': "All requests to the service you are trying to reach are timing out.",
		'135': "Error occurred while redirecting your request to the service",
		'136': "RM catched an error while redirecting to service.",

		'15x': "REST CORE",
		'150': "Something blew up @ rest core!",
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
		'165': "",

		'170': "INPUTMASK",

		'20x': "PROVISION",
		'200': 'You need to provide an external key.',
		'201': 'You need to provide a package code.',
		'202': 'Unable to load tenant keys data.',
		'203': 'Unable to generate external key from provided key.',
		'204': 'Unable to generate internal key.'
	}
};