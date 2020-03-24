"use strict";

var http = require('http');


/**
 * Returns the IP of the request. The true client IP can come from multiple sources, depending on whether a
 * reverse-proxy is used or not When this app is reverse-proxied behind Nginx, and Nginx is listening on an IPv6 socket,
 * and the client connects with IPv4, the IP address will be formatted as IPv6, such as ::ffff:1.2.3.4. We need to strip
 * the prefix so we can look up the PTR record for the IP.
 *
 * @returns {*}
 */
http.IncomingMessage.prototype.getClientIP = function() {
    var x_forwarded_for = this.get('x-forwarded-for') ? this.get('x-forwarded-for').split(',')[0] : '';
    var ip_address = this.get('x-real-ip') || x_forwarded_for || this.connection.remoteAddress;

    return ip_address ? ip_address.replace(/^::ffff:/i, '') : null;
};

http.IncomingMessage.prototype.getClientUserAgent = function () {
    return this.get('user-agent');
};



