"use strict";
var fs = require('fs');
var assert = require('assert');
var helper = require("../helper.js");
var coreMail = helper.requireModule('./modules/soajs.core/mail/index');
var soajsMail = helper.requireModule('./index.js').mail;

var recipient = "mike.hajj@gmail.com"; //valid email address

describe("testing mail functionality", function() {

	describe("testing core mail", function() {
		var mailer;

		it("fail - invalid declaration", function(done) {
			try {
				mailer = new coreMail({});
			} catch(e) {
				assert.ok(e);
				assert.equal(e.message, "transport error: 'type' is required - 'options' is required");
			}
			done();
		});

		it("success - should initialize mail default", function(done) {
			mailer = new coreMail();
			assert.ok(mailer);
			done();
		});

		it("success - should initialize mail direct", function(done) {
			mailer = new coreMail({'type': 'direct', 'options': {}});
			assert.ok(mailer);
			done();
		});

		it("success - should initialize mail smtp", function(done) {
			mailer = new coreMail({
				'type': 'smtp',
				'options': {
					'host': 'localhost', //mandatory param if type is smtp
					'port': '25',        //mandatory param if type is smtp
					ignoreTLS: true,     //mandatory param if type is smtp
					secure: false,       //mandatory param if type is smtp
					'auth': {            //mandatory param if type is smtp
						'user': 'username',
						'pass': 'password'
					}
				}
			});
			assert.ok(mailer);
			done();
		});

		it("success - should initialize mail sendmail", function(done) {
			mailer = new coreMail({'type': 'sendmail', 'options': {}});
			assert.ok(mailer);
			done();
		});

		it("fail - should not send mail, missing arguments", function(done) {
			var mailOptions = {
				'from': 'me@myself.com',
				'to': 'me@myself.com'
			};
			mailer.send(mailOptions, function(error, info) {
				assert.ok(error);
				assert.ok(!info);
				assert.equal(error.message, "mailOptions error: 'subject' is required - 'text' is required");
				done();
			});
		});

		it("fail - should not send mail", function(done) {

			mailer.send({'mailOptions': {}}, function(error, info) {
				assert.ok(error);
				assert.ok(!info);
				assert.equal(error.message, "mailOptions error: 'from' is required - 'to' is required - 'subject' is required - 'text' is required");
				done();
			});
		});

		it("success - should send mail", function(done) {

			var mailOptions = {
				'from': 'me@localhost.com',
				'to': recipient,
				'subject': 'Register Notification',
				'html': "<p>Dear <b>{{ username }}</b>,<br /><br />Regards,<br/>SOAJS Team.</p>",
				'text': "Dear {{ username }},\n\rRegards,\nSOAJS Team."
			};
			mailer.send(mailOptions, function(error, info) {
				assert.ifError(error);
				assert.ok(info);
				console.log(info);
				done();
			});
		});
	});

	describe("testing soajs.mail library", function() {
		var soajsMailer;
		it("initialise soajsMail", function(done) {
			soajsMailer = new soajsMail({
				'type': 'sendmail',
				'options': {
				}
			});
			assert.ok(soajsMailer);
			done();
		});

		it("fail - should not send mail missing fields", function(done) {

			var mailOptions = {
				'from': 'me@localhost.com',
				'to': recipient
			};

			soajsMailer.send(mailOptions, function(error, info) {
				assert.ok(error);
				assert.ok(!info);
				assert.equal(error.message, "soajs.mail error: 'subject' is required");
				done();
			});
		});

		it("success - should send mail with html no template", function(done) {

			var mailOptions = {
				'from': 'me@localhost.com',
				'to': recipient,
				'subject': 'Hello World',
				'html': '<p>foo!!</p>',
				'text': 'foo!!'
			};

			soajsMailer.send(mailOptions, function(error, info) {
				assert.ifError(error);
				assert.ok(info);
				console.log(info);
				done();
			});
		});

		it("success - should send mail with template as string", function(done) {

			var mailOptions = {
				'from': 'me@localhost.com',
				'to': recipient,
				'subject': 'Register Notification',
				'content': "<p>Dear <b>{{ username }}</b>,<br /><br />Regards,<br/>SOAJS Team.</p>",
				'data': {
					'username': 'johndoe'
				}
			};
			soajsMailer.renderTemplate(mailOptions);
			soajsMailer.send(mailOptions, function(error, info) {
				assert.ifError(error);
				assert.ok(info);
				console.log(info);
				done();
			});
		});

		it("success - should send mail with template from file", function(done) {
			fs.writeFileSync(__dirname + "/mytmpl.txt", "<p>Dear <b>{{ username }}</b>,<br /><br />Regards,<br/>SOAJS Team.</p>");
			var mailOptions = {
				'from': 'me@localhost.com',
				'to': recipient,
				'subject': 'Register Notification',
				'path': __dirname + '/mytmpl.txt',
				'data': {
					'username': 'johndoe'
				}
			};
			soajsMailer.renderTemplate(mailOptions);
			soajsMailer.send(mailOptions, function(error, info) {
				assert.ifError(error);
				assert.ok(info);
				console.log(info);
				done();
			});
		});

		it("success - should send mail with more options", function(done) {
			fs.writeFileSync(__dirname + '/att2.txt', "Hello world.");

			var mailOptions = {
				'from': 'me@localhost.com',
				'to': recipient,
				'service': 'urac',
				'subject': 'Register Notification with attachments',
				'path': __dirname + '/mytmpl.txt',
				'data': {
					'username': 'johndoe'
				},
				attachments: [
					{
						"filename": "att1.txt",
						"content": "Hello world."
					},
					{
						"filename": "att2.txt",
						"path": __dirname + "/att2.txt"
					}
				]
			};

			soajsMailer.renderTemplate(mailOptions);
			soajsMailer.send(mailOptions, function(error, info) {
				assert.ifError(error);
				assert.ok(info);
				console.log(info);
				fs.unlinkSync(__dirname + "/att2.txt");
				fs.unlinkSync(__dirname + "/mytmpl.txt");
				done();
			});
		});

	});
});