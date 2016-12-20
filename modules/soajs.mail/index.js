"use strict";
var fs = require('fs');
var core = require("../soajs.core");
var validator = new core.validator.Validator();

var config = require("./config");
var handlebars = null;

var mailer = function(config) {
	handlebars = require("handlebars");
	this.mail = new core.getMail(config);
};

mailer.prototype.renderTemplate = function(mailOptions) {
	var tmplPath = (mailOptions.path) ? fs.readFileSync(mailOptions.path, {'encoding': 'utf8'}) : mailOptions.content;

	var template = handlebars.compile(tmplPath);
	mailOptions.html = template(mailOptions.data);
	mailOptions.text = mailOptions.html.replace(/(<([^>]+)>)/ig, "");//strip tags

	delete mailOptions.content;
	delete mailOptions.data;
};

mailer.prototype.send = function(mailOptions, callback) {
	if(!mailOptions.data) {
		mailOptions.data = {};
	}
	if(mailOptions.content || mailOptions.path) {
		this.renderTemplate(mailOptions);
	}

	var x = validator.validate(mailOptions, config.schema);
	if(x.errors && x.errors.length > 0) {
		var err = [];
		for(var m = 0; m < x.errors.length; m++) {
			var xsm = "'" + x.errors[m].property.replace('instance.', '') + "'";
			xsm += ' ' + x.errors[m].message;
			err.push(xsm);
		}
		return callback(new Error("soajs.mail error: " + err.join(" - ")));
	}

	this.mail.send(mailOptions, callback);
};

module.exports = mailer;