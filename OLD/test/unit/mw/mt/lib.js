"use strict";

const helper = require("../../../helper.js");
const lib = helper.requireModule('./mw/mt/lib');
const assert = require('assert');


describe("Unit test for: mw - mt lib", () => {
	
	it("testing mergeACLArray full array", (done) => {
		let acl = [
			{
				"acl": {
					"oauth": {
						"1": {
							"access": false,
							apisPermission: "restricted",
							"delete": {
								"apis": {
									"/refreshToken/:token": {
										"access": true
									}
								}
							}
						}
					},
					"golang": {
						"1": {
							"access": false,
							apisPermission: "restricted",
							"delete": {
								"apis": {
									"/refreshToken/:token": {
										"access": true
									}
								}
							}
						}
					},
					"urac": {
						"2": {
							"access": true,
							"get": {
								"apis": {
									"/changeEmail/validate": {
										"access": true
									}
								}
							},
							"post": {
								"apis": {
									"/resetPassword": {
										"access": true
									}
								}
							},
							"delete": {
								"apis": {
									"/admin/group/delete": {
										"access": false
									}
								}
							}
						},
						"1": {
							"access": true,
							"get": {
								"apis": {
									"/changeEmail/validate": {
										"access": true
									}
								}
							},
							"post": {
								"apis": {
									"/resetPassword": {
										"access": true
									}
								}
							},
							"delete": {
								"apis": {
									"/admin/group/delete": {
										"access": false
									}
								}
							}
						}
					},
					"dashboard": {
						"1": {
							"access": false,
							apisPermission: "restricted",
							"post": {
								"apis": {
									"/cd/deploy": {
										"access": false
									}
								}
							}
						}
					}
				},
				"acl_all_env": {
					"dashboard": {
						"oauth": {
							"1": {
								"apisPermission": "restricted",
								"access": false,
								"delete": {
									"apis": {
										"/refreshTokendfdf/:token": {
											"access": true
										}
									}
								}
							}
						},
						"urac": {
							"2": {
								"access": true,
								"get": {
									"apis": {
										"/changeEmail/validate": {
											"access": true
										}
									}
								},
								"post": {
									"apis": {
										"/resetPassword": {
											"access": true
										}
									}
								},
								"delete": {
									"apis": {
										"/admin/group/delete": {
											"access": true
										}
									}
								}
							},
							"1": {
								"access": true,
								"get": {
									"apis": {
										"/changeEmail/validate": {
											"access": true
										}
									}
								},
								"post": {
									"apis": {
										"/resetPassword": {
											"access": true
										}
									}
								},
								"delete": {
									"apis": {
										"/admin/group/delete": {
											"access": true
										}
									}
								}
							}
						},
						"dashboard": {
							"1": {
								"apisPermission": "restricted",
								"access": false,
								"post": {
									"apis": {
										"/cd/deploy": {
											"access": false
										}
									}
								}
							}
						}
					}
				},
				"_TTL": 604800000,
				"_TIME": 1566907223198
			},
			{
				"acl": {
					"oauth": {
						"1": {
							"access": false,
							"delete": {
								"apis": {
									"/refreshToken/:token": {
										"access": false
									},
									"/blabla/:token": {
										"access": true
									}
								}
							}
						},
						"2": {
							"access": false,
							"delete": {
								"apis": {
									"/refreshToken/:token": {
										"access": false
									},
									"/blabla/:token": {
										"access": true
									}
								}
							}
						}
					},
					"urac": {
						"2": {
							"access": true,
							"get": {
								"apis": {
									"/changeEmail/validate": {
										"access": false
									}
								}
							},
							"post": {
								"apis": {
									"/resetPassword": {
										"access": true
									}
								}
							},
							"delete": {
								"apis": {
									"/admin/group/delete": {
										"access": true
									}
								}
							}
						},
						"1": {
							apisPermission: "restricted",
							"access": true,
							"get": {
								"apis": {
									"/changeEmail/validate": {
										"access": true
									}
								}
							},
							"post": {
								"apis": {
									"/resetPassword": {
										"access": true
									}
								}
							},
							"delete": {
								"apis": {
									"/admin/group/delete": {
										"access": true
									}
								}
							}
						}
					},
					"dashboard": {
						"1": {
							"access": true,
							apisPermission: "restricted",
							"post": {
								"apis": {
									"/cd/deploy": {
										"access": false
									}
								}
							}
						}
					},
					"node": {
						"1": {
							"access": false,
							apisPermission: "restricted",
							"delete": {
								"apis": {
									"/refreshToken/:token": {
										"access": true
									}
								}
							}
						}
					}
				},
				"acl_all_env": {
					"dev": {
						"oauth": {
							"1": {
								"access": false,
								"delete": {
									"apis": {
										"/refreshToken/:token": {
											"access": false
										}
									}
								}
							}
						}
					},
					"dashboard": {
						"node": {
							"1": {
								"apisPermission": "restricted",
								"access": false,
								"delete": {
									"apis": {
										"/refreshTokendfdf/:token": {
											"access": true
										}
									}
								}
							}
						},
						"oauth": {
							"1": {
								"access": false,
								"delete": {
									"apis": {
										"/refreshToken/:token": {
											"access": false
										}
									}
								}
							},
							"3": {
								"apisPermission": "restricted",
								"access": false,
								"delete": {
									"apis": {
										"/refreshTokendfdf/:token": {
											"access": true
										}
									}
								}
							}
						},
						"urac": {
							"2": {
								"access": true,
								"get": {
									"apis": {
										"/changeEmail/validate": {
											"access": true
										}
									}
								},
								"post": {
									"apis": {
										"/resetPassword": {
											"access": true
										}
									}
								},
								"delete": {
									"apis": {
										"/admin/group/delete": {
											"access": true
										}
									}
								}
							},
							"1": {
								"apisPermission": "restricted",
								"access": true,
								"get": {
									"apis": {
										"/changeEmail/validate": {
											"access": true
										}
									}
								},
								"post": {
									"apis": {
										"/resetPassword": {
											"access": true
										}
									}
								},
								"delete": {
									"apis": {
										"/admin/group/delete": {
											"access": true
										}
									}
								}
							}
						},
						"dashboard": {
							"1": {
								"apisPermission": "restricted",
								"access": false,
								"post": {
									"apis": {
										"/cd/deploy": {
											"access": false
										}
									}
								}
							}
						}
					}
				},
				"_TTL": 604800000,
				"_TIME": 1466907223198
			},
			{
				"acl": {
					"oauth": {
						"1": {
							"access": false,
							"delete": {
								"apis": {
									"/refreshToken/:token": {
										"access": false
									},
									"/blabla/:token": {
										"access": true
									}
								}
							}
						},
						"2": {
							"access": false,
							"delete": {
								"apis": {
									"/refreshToken/:token": {
										"access": false
									},
									"/blabla/:token": {
										"access": true
									}
								}
							}
						}
					},
					"urac": {
						"2": {
							"access": true,
							"get": {
								"apis": {
									"/changeEmail/validate": {
										"access": false
									}
								}
							},
							"post": {
								"apis": {
									"/resetPassword": {
										"access": true
									}
								}
							},
							"delete": {
								"apis": {
									"/admin/group/delete": {
										"access": true
									}
								}
							}
						},
						"1": {
							apisPermission: "restricted",
							"access": true,
							"get": {
								"apis": {
									"/changeEmail/validate": {
										"access": true
									}
								}
							},
							"post": {
								"apis": {
									"/resetPassword": {
										"access": true
									}
								}
							},
							"delete": {
								"apis": {
									"/admin/group/delete": {
										"access": true
									}
								}
							}
						}
					},
					"dashboard": {
						"1": {
							"access": true,
							apisPermission: "restricted",
							"post": {
								"apis": {
									"/cd/deploy": {
										"access": false
									}
								}
							}
						}
					}
				},
				"acl_all_env": {
					"dev": {
						"oauth": {
							"1": {
								"access": false,
								"delete": {
									"apis": {
										"/refreshToken/:token": {
											"access": false
										}
									}
								}
							},
							"2": {
								"apisPermission": "restricted",
								"access": false,
								"delete": {
									"apis": {
										"/refreshTokendfdf/:token": {
											"access": true
										}
									}
								}
							}
						}
					},
					"dashboard": {
						"oauth": {
							"1": {
								"access": false,
								"delete": {
									"apis": {
										"/refreshToken/:token": {
											"access": false
										}
									}
								}
							}
						},
						"finite": {
							"1": {
								"apisPermission": "restricted",
								"access": false,
								"delete": {
									"apis": {
										"/refreshTokendfdf/:token": {
											"access": true
										}
									}
								}
							}
						},
						"urac": {
							"2": {
								"access": true,
								"get": {
									"apis": {
										"/changeEmail/validate": {
											"access": true
										}
									}
								},
								"post": {
									"apis": {
										"/resetPassword": {
											"access": true
										}
									}
								},
								"delete": {
									"apis": {
										"/admin/group/delete": {
											"access": true
										}
									}
								}
							},
							"1": {
								"apisPermission": "restricted",
								"access": true,
								"get": {
									"apis": {
										"/changeEmail/validate": {
											"access": true
										}
									}
								},
								"post": {
									"apis": {
										"/resetPassword": {
											"access": true
										}
									}
								},
								"delete": {
									"apis": {
										"/admin/group/delete": {
											"access": true
										}
									}
								}
							}
						},
						"dashboard": {
							"1": {
								"apisPermission": "restricted",
								"access": false,
								"post": {
									"apis": {
										"/cd/deploy": {
											"access": false
										}
									}
								}
							}
						}
					}
				},
				"_TTL": 604800000,
				"_TIME": 1466907223198
			}
			];
		lib.mergeACLArray(acl, (err, result) => {
			assert.ok(result); // mw next function is called
			done();
		});
	});
	it("testing mergeACLArray one array", (done) => {
		let acl = [
			{
				"acl": {
					"oauth": {
						"1": {
							"access": false,
							apisPermission: "restricted",
							"delete": {
								"apis": {
									"/refreshToken/:token": {
										"access": true
									}
								}
							}
						}
					},
					"urac": {
						"2": {
							"access": true,
							"get": {
								"apis": {
									"/changeEmail/validate": {
										"access": true
									}
								}
							},
							"post": {
								"apis": {
									"/resetPassword": {
										"access": true
									}
								}
							},
							"delete": {
								"apis": {
									"/admin/group/delete": {
										"access": false
									}
								}
							}
						},
						"1": {
							"access": true,
							"get": {
								"apis": {
									"/changeEmail/validate": {
										"access": true
									}
								}
							},
							"post": {
								"apis": {
									"/resetPassword": {
										"access": true
									}
								}
							},
							"delete": {
								"apis": {
									"/admin/group/delete": {
										"access": false
									}
								}
							}
						}
					},
					"dashboard": {
						"1": {
							"access": false,
							apisPermission: "restricted",
							"post": {
								"apis": {
									"/cd/deploy": {
										"access": false
									}
								}
							}
						}
					}
				},
				"acl_all_env": {
					"dashboard": {
						"oauth": {
							"1": {
								"apisPermission": "restricted",
								"access": false,
								"delete": {
									"apis": {
										"/refreshTokendfdf/:token": {
											"access": true
										}
									}
								}
							}
						},
						"urac": {
							"2": {
								"access": true,
								"get": {
									"apis": {
										"/changeEmail/validate": {
											"access": true
										}
									}
								},
								"post": {
									"apis": {
										"/resetPassword": {
											"access": true
										}
									}
								},
								"delete": {
									"apis": {
										"/admin/group/delete": {
											"access": true
										}
									}
								}
							},
							"1": {
								"access": true,
								"get": {
									"apis": {
										"/changeEmail/validate": {
											"access": true
										}
									}
								},
								"post": {
									"apis": {
										"/resetPassword": {
											"access": true
										}
									}
								},
								"delete": {
									"apis": {
										"/admin/group/delete": {
											"access": true
										}
									}
								}
							}
						},
						"dashboard": {
							"1": {
								"apisPermission": "restricted",
								"access": false,
								"post": {
									"apis": {
										"/cd/deploy": {
											"access": false
										}
									}
								}
							}
						}
					}
				},
				"_TTL": 604800000,
				"_TIME": 1566907223198
			}];
		lib.mergeACLArray(acl, (err, result) => {
			assert.ok(result); // mw next function is called
			done();
		});
	});
});