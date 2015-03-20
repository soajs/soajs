"use strict";

var validator = new (require("../validator/").Validator)();
var config = require('./config');

var mailer = function(configuration) {
	var transport;
	var nodeMailerDirectTransport = null;

	//if no conf, switch to direct transport driver with default options
	if(!configuration) {
		nodeMailerDirectTransport = require('nodemailer-direct-transport');
		transport = nodeMailerDirectTransport(config.transport.default);
	} else {
		//if no type nor options, throw error
		var x = validator.validate(configuration, config.schema.transport);
		if(x.errors && x.errors.length > 0) {
			var err = [];
			for(var m = 0; m < x.errors.length; m++) {
				var xsm = "'" + x.errors[m].property.replace('instance.', '') + "'";
				xsm += ' ' + x.errors[m].message;
				err.push(xsm);
			}
			throw new Error("transport error: " + err.join(" - "));
		}

		//check type and use corresponding transport driver
		switch(configuration.type.toLowerCase()) {
			case 'smtp':
				var nodemailerSmtpTransport = require('nodemailer-smtp-transport');
				transport = nodemailerSmtpTransport(configuration.options);
				break;
			case 'sendmail':
				var nodemailerSendmailTransport = require('nodemailer-sendmail-transport');
				transport = nodemailerSendmailTransport(configuration.options);
				break;
			default:
				nodeMailerDirectTransport = require('nodemailer-direct-transport');
				transport = nodeMailerDirectTransport(configuration.options);
				break;
		}
	}

	//initialize the transporter with driver from above
	var nodemailer = require("nodemailer");
	this.transporter = nodemailer.createTransport(transport);
};

mailer.prototype.send = function(mailOptions, callback) {
	var x = validator.validate(mailOptions, config.schema.mailOptions);
	if(x.errors && x.errors.length > 0) {
		var err = [];
		for(var m = 0; m < x.errors.length; m++) {
			var xsm = "'" + x.errors[m].property.replace('instance.', '') + "'";
			xsm += ' ' + x.errors[m].message;
			err.push(xsm);
		}
		return callback(new Error("mailOptions error: " + err.join(" - ")));
	}

	//tell the driver to send the mail
	this.transporter.sendMail(mailOptions, callback);
};

module.exports = mailer;