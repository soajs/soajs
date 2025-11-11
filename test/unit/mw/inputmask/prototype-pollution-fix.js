"use strict";
/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */

const assert = require("assert");
const helper = require("../../../helper.js");

const inputmask = helper.requireModule('./mw/inputmask/inputmask.js');

describe("Testing Prototype Pollution vulnerability fix", function () {

	it("Security - Should block __proto__ in object properties", function (done) {
		let obj = {
			req: {
				body: {
					normalField: 'normalValue',
					__proto__: { isAdmin: true }
				},
				query: {},
				params: {},
				headers: { 'content-type': 'application/json' },
				soajs: {
					servicesConfig: {}
				}
			},
			inputmaskSrc: ['body'],
			config: {
				serviceName: 'test',
				schema: {
					testAPI: {
						normalField: {
							source: ['body'],
							validation: {
								type: 'string'
							}
						},
						__proto__: {
							source: ['body'],
							validation: {
								type: 'object'
							}
						}
					}
				}
			},
			configValidator: {
				validate: () => ({ valid: true })
			},
			method: 'post',
			apiName: 'testAPI'
		};

		inputmask.mapFormatAndValidate(obj, function (error, data) {
			assert.equal(error, null);
			assert.ok(data);
			// __proto__ should be blocked - check using hasOwnProperty
			assert.equal(data.hasOwnProperty('__proto__'), false);
			// Normal field should be present
			assert.equal(data.normalField, 'normalValue');
			done();
		});
	});

	it("Security - Should block constructor in object properties", function (done) {
		let obj = {
			req: {
				body: {
					normalField: 'normalValue',
					constructor: { dangerous: true }
				},
				query: {},
				params: {},
				headers: { 'content-type': 'application/json' },
				soajs: {
					servicesConfig: {}
				}
			},
			inputmaskSrc: ['body'],
			config: {
				serviceName: 'test',
				schema: {
					testAPI: {
						normalField: {
							source: ['body'],
							validation: {
								type: 'string'
							}
						},
						constructor: {
							source: ['body'],
							validation: {
								type: 'object'
							}
						}
					}
				}
			},
			configValidator: {
				validate: () => ({ valid: true })
			},
			method: 'post',
			apiName: 'testAPI'
		};

		inputmask.mapFormatAndValidate(obj, function (error, data) {
			assert.equal(error, null);
			assert.ok(data);
			// constructor should be blocked - check using hasOwnProperty
			assert.equal(data.hasOwnProperty('constructor'), false);
			// Normal field should be present
			assert.equal(data.normalField, 'normalValue');
			done();
		});
	});

	it("Security - Should block prototype in object properties", function (done) {
		let obj = {
			req: {
				body: {
					normalField: 'normalValue',
					prototype: { polluted: true }
				},
				query: {},
				params: {},
				headers: { 'content-type': 'application/json' },
				soajs: {
					servicesConfig: {}
				}
			},
			inputmaskSrc: ['body'],
			config: {
				serviceName: 'test',
				schema: {
					testAPI: {
						normalField: {
							source: ['body'],
							validation: {
								type: 'string'
							}
						},
						prototype: {
							source: ['body'],
							validation: {
								type: 'object'
							}
						}
					}
				}
			},
			configValidator: {
				validate: () => ({ valid: true })
			},
			method: 'post',
			apiName: 'testAPI'
		};

		inputmask.mapFormatAndValidate(obj, function (error, data) {
			assert.equal(error, null);
			assert.ok(data);
			// prototype should be blocked
			assert.equal(data.prototype, undefined);
			// Normal field should be present
			assert.equal(data.normalField, 'normalValue');
			done();
		});
	});

	it("Success - Should allow safe object properties", function (done) {
		let obj = {
			req: {
				body: {
					name: 'John',
					age: 30,
					email: 'john@example.com',
					address: {
						street: '123 Main St',
						city: 'New York'
					}
				},
				query: {},
				params: {},
				headers: { 'content-type': 'application/json' },
				soajs: {
					servicesConfig: {}
				}
			},
			inputmaskSrc: ['body'],
			config: {
				serviceName: 'test',
				schema: {
					testAPI: {
						name: {
							source: ['body'],
							validation: {
								type: 'string'
							}
						},
						age: {
							source: ['body'],
							validation: {
								type: 'integer'
							}
						},
						email: {
							source: ['body'],
							validation: {
								type: 'string'
							}
						},
						address: {
							source: ['body'],
							validation: {
								type: 'object',
								properties: {
									street: { type: 'string' },
									city: { type: 'string' }
								}
							}
						}
					}
				}
			},
			configValidator: {
				validate: () => ({ valid: true })
			},
			method: 'post',
			apiName: 'testAPI'
		};

		inputmask.mapFormatAndValidate(obj, function (error, data) {
			assert.equal(error, null);
			assert.ok(data);
			assert.equal(data.name, 'John');
			assert.equal(data.age, 30);
			assert.equal(data.email, 'john@example.com');
			assert.ok(data.address);
			assert.equal(data.address.street, '123 Main St');
			assert.equal(data.address.city, 'New York');
			done();
		});
	});

	it("Security - Mixed safe and dangerous properties", function (done) {
		let obj = {
			req: {
				body: {
					safeField1: 'safe1',
					__proto__: { malicious: true },
					safeField2: 'safe2',
					constructor: { dangerous: true },
					safeField3: 'safe3'
				},
				query: {},
				params: {},
				headers: { 'content-type': 'application/json' },
				soajs: {
					servicesConfig: {}
				}
			},
			inputmaskSrc: ['body'],
			config: {
				serviceName: 'test',
				schema: {
					testAPI: {
						safeField1: {
							source: ['body'],
							validation: {
								type: 'string'
							}
						},
						__proto__: {
							source: ['body'],
							validation: {
								type: 'object'
							}
						},
						safeField2: {
							source: ['body'],
							validation: {
								type: 'string'
							}
						},
						constructor: {
							source: ['body'],
							validation: {
								type: 'object'
							}
						},
						safeField3: {
							source: ['body'],
							validation: {
								type: 'string'
							}
						}
					}
				}
			},
			configValidator: {
				validate: () => ({ valid: true })
			},
			method: 'post',
			apiName: 'testAPI'
		};

		inputmask.mapFormatAndValidate(obj, function (error, data) {
			assert.equal(error, null);
			assert.ok(data);
			// Dangerous properties should be blocked - check using hasOwnProperty
			assert.equal(data.hasOwnProperty('__proto__'), false);
			assert.equal(data.hasOwnProperty('constructor'), false);
			// Safe properties should be present
			assert.equal(data.safeField1, 'safe1');
			assert.equal(data.safeField2, 'safe2');
			assert.equal(data.safeField3, 'safe3');
			done();
		});
	});

	it("Security - Verify prototype chain is not polluted", function (done) {
		// Create a clean object before the test
		const cleanObject = {};
		assert.equal(cleanObject.polluted, undefined);

		let obj = {
			req: {
				body: {
					normalField: 'test',
					__proto__: { polluted: true }
				},
				query: {},
				params: {},
				headers: { 'content-type': 'application/json' },
				soajs: {
					servicesConfig: {}
				}
			},
			inputmaskSrc: ['body'],
			config: {
				serviceName: 'test',
				schema: {
					testAPI: {
						normalField: {
							source: ['body'],
							validation: {
								type: 'string'
							}
						},
						__proto__: {
							source: ['body'],
							validation: {
								type: 'object'
							}
						}
					}
				}
			},
			configValidator: {
				validate: () => ({ valid: true })
			},
			method: 'post',
			apiName: 'testAPI'
		};

		inputmask.mapFormatAndValidate(obj, function (error, data) {
			assert.equal(error, null);

			// Create another clean object after the test
			const anotherCleanObject = {};

			// Verify the prototype chain was not polluted
			assert.equal(anotherCleanObject.polluted, undefined);
			assert.equal(cleanObject.polluted, undefined);

			done();
		});
	});

});
