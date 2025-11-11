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

describe("Testing ReDoS vulnerability fix", function () {

	it("Success - Safe patternProperties pattern should be accepted", function (done) {
		let obj = {
			req: {
				query: { testField: 'value' },
				body: {},
				params: {},
				headers: { 'content-type': 'application/json' },
				soajs: {
					servicesConfig: {}
				}
			},
			inputmaskSrc: ['query'],
			config: {
				serviceName: 'test',
				schema: {
					testAPI: {
						testField: {
							source: ['query'],
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
			method: 'get',
			apiName: 'testAPI'
		};

		inputmask.mapFormatAndValidate(obj, function (error, data) {
			assert.equal(error, null);
			assert.ok(data);
			assert.equal(data.testField, 'value');
			done();
		});
	});

	it("Success - Safe regexp type should be accepted", function (done) {
		let obj = {
			req: {
				query: { pattern: '^[a-z]+$' },
				body: {},
				params: {},
				headers: {},
				soajs: {
					servicesConfig: {}
				}
			},
			inputmaskSrc: ['query'],
			config: {
				serviceName: 'test',
				schema: {
					testAPI: {
						pattern: {
							source: ['query'],
							validation: {
								type: 'regexp'
							}
						}
					}
				}
			},
			configValidator: {
				validate: () => ({ valid: true })
			},
			method: 'get',
			apiName: 'testAPI'
		};

		inputmask.mapFormatAndValidate(obj, function (error, data) {
			assert.equal(error, null);
			assert.ok(data);
			assert.ok(data.pattern instanceof RegExp);
			assert.equal(data.pattern.source, '^[a-z]+$');
			done();
		});
	});

	it("Security - Malicious regexp pattern (a+)+ should be blocked", function (done) {
		let obj = {
			req: {
				query: { pattern: '(a+)+' },
				body: {},
				params: {},
				headers: {},
				soajs: {
					servicesConfig: {}
				}
			},
			inputmaskSrc: ['query'],
			config: {
				serviceName: 'test',
				schema: {
					testAPI: {
						pattern: {
							source: ['query'],
							validation: {
								type: 'regexp'
							}
						}
					}
				}
			},
			configValidator: {
				validate: () => ({ valid: true })
			},
			method: 'get',
			apiName: 'testAPI'
		};

		inputmask.mapFormatAndValidate(obj, function (error, data) {
			// The malicious pattern should be caught and logged
			// The value should be returned as-is (not converted to RegExp)
			assert.ok(data);
			// If pattern was blocked, it should remain as string
			if (data.pattern) {
				assert.equal(typeof data.pattern, 'string');
			}
			done();
		});
	});

	it("Security - Malicious regexp pattern (x+x+)+ should be blocked", function (done) {
		let obj = {
			req: {
				query: { pattern: '(x+x+)+' },
				body: {},
				params: {},
				headers: {},
				soajs: {
					servicesConfig: {}
				}
			},
			inputmaskSrc: ['query'],
			config: {
				serviceName: 'test',
				schema: {
					testAPI: {
						pattern: {
							source: ['query'],
							validation: {
								type: 'regexp'
							}
						}
					}
				}
			},
			configValidator: {
				validate: () => ({ valid: true })
			},
			method: 'get',
			apiName: 'testAPI'
		};

		inputmask.mapFormatAndValidate(obj, function (error, data) {
			// The malicious pattern should be caught and logged
			assert.ok(data);
			// If pattern was blocked, it should remain as string
			if (data.pattern) {
				assert.equal(typeof data.pattern, 'string');
			}
			done();
		});
	});

	it("Security - Very long regexp pattern (>500 chars) should be blocked", function (done) {
		let longPattern = 'a'.repeat(501);
		let obj = {
			req: {
				query: { pattern: longPattern },
				body: {},
				params: {},
				headers: {},
				soajs: {
					servicesConfig: {}
				}
			},
			inputmaskSrc: ['query'],
			config: {
				serviceName: 'test',
				schema: {
					testAPI: {
						pattern: {
							source: ['query'],
							validation: {
								type: 'regexp'
							}
						}
					}
				}
			},
			configValidator: {
				validate: () => ({ valid: true })
			},
			method: 'get',
			apiName: 'testAPI'
		};

		inputmask.mapFormatAndValidate(obj, function (error, data) {
			// Long patterns should be blocked
			assert.ok(data);
			// Pattern should remain as string
			if (data.pattern) {
				assert.equal(typeof data.pattern, 'string');
			}
			done();
		});
	});

	it("Security - Complex nested quantifier (a*)*b should be blocked", function (done) {
		let obj = {
			req: {
				query: { pattern: '(a*)*b' },
				body: {},
				params: {},
				headers: {},
				soajs: {
					servicesConfig: {}
				}
			},
			inputmaskSrc: ['query'],
			config: {
				serviceName: 'test',
				schema: {
					testAPI: {
						pattern: {
							source: ['query'],
							validation: {
								type: 'regexp'
							}
						}
					}
				}
			},
			configValidator: {
				validate: () => ({ valid: true })
			},
			method: 'get',
			apiName: 'testAPI'
		};

		inputmask.mapFormatAndValidate(obj, function (error, data) {
			// Nested quantifiers should be blocked
			assert.ok(data);
			// Pattern should remain as string
			if (data.pattern) {
				assert.equal(typeof data.pattern, 'string');
			}
			done();
		});
	});

	it("Success - Common safe patterns should work", function (done) {
		// Test multiple safe patterns
		const safePatterns = [
			'^[a-zA-Z0-9]+$',
			'\\d{3}-\\d{3}-\\d{4}',
			'^[a-z]{1,10}$',
			'[A-Z]+',
			'\\w+'
		];

		let completed = 0;

		safePatterns.forEach(pattern => {
			let obj = {
				req: {
					query: { pattern: pattern },
					body: {},
					params: {},
					headers: {},
					soajs: {
						servicesConfig: {}
					}
				},
				inputmaskSrc: ['query'],
				config: {
					serviceName: 'test',
					schema: {
						testAPI: {
							pattern: {
								source: ['query'],
								validation: {
									type: 'regexp'
								}
							}
						}
					}
				},
				configValidator: {
					validate: () => ({ valid: true })
				},
				method: 'get',
				apiName: 'testAPI'
			};

			inputmask.mapFormatAndValidate(obj, function (error, data) {
				assert.equal(error, null);
				assert.ok(data);
				assert.ok(data.pattern instanceof RegExp);
				completed++;
				if (completed === safePatterns.length) {
					done();
				}
			});
		});
	});

});
