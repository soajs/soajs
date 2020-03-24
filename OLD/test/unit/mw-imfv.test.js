var assert = require('assert');
var helper = require("../helper.js");

var imfv = helper.requireModule('./mw/inputmask');

describe("testing imfv", function(){
	
	it("fail - null config", function (done) {
		
		try{
			imfv(null, null);
		}
		catch(e){
			assert.ok(e);
			done();
		}
	});
	
	it("fail - empty config", function (done) {
		
		try{
			imfv({}, null);
		}
		catch(e){
			assert.ok(e);
			done();
		}
	});
});