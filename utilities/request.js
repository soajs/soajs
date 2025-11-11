"use strict";

/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */

const http = require('http');
const logger = require('./logger');

function httpRequestLight({ uri, data = null, body = null, qs = null, method = 'GET', headers = null, json = true }) {
    return new Promise((resolve, reject) => {
        data = data || body; // to be compatible with request package

        let settled = false;
        let options = {};
        const requestDataString = data ? (json ? JSON.stringify(data) : data.toString()) : '';

        // Atomic settlement helper to prevent race conditions
        const settleOnce = (settler, value) => {
            if (settled) {
                logger.warn('Security: Request handler - Attempted to settle promise multiple times', {
                    value: value instanceof Error ? value.message : (typeof value === 'string' ? value : 'data')
                });
                return false;
            }
            settled = true;
            settler(value);
            return true;
        };

        try {
            const urlObj = new URL(uri);
            options = {
                hostname: urlObj.hostname,
                port: urlObj.port,
                path: urlObj.pathname + urlObj.search,
                method: method.toUpperCase(), // Ensure method is uppercase
                headers: {
                    'Content-Type': json ? 'application/json' : 'application/x-www-form-urlencoded',
                    'Content-Length': data ? Buffer.byteLength(requestDataString) : 0,
                },
            };
            if (qs) {
                // Merge query parameters into the path
                const existingParams = new URLSearchParams(options.path.split('?')[1] || '');
                const mergedParams = new URLSearchParams();

                // Add existing params
                existingParams.forEach((value, key) => {
                    mergedParams.append(key, value);
                });

                // Add/override queryParams
                for (const key in qs) {
                    if (qs.hasOwnProperty(key)) {
                        mergedParams.set(key, qs[key]);
                    }
                }

                const queryString = mergedParams.toString();
                const basePath = options.path.split('?')[0];

                options.path = basePath + (queryString ? `?${queryString}` : '');
            }
            if (headers) {
                for (const key in headers) {
                    if (headers.hasOwnProperty(key)) {
                        options.headers[key] = headers[key];
                    }
                }
            }
        } catch (error) {
            settleOnce(reject, error);
            return;
        }

        const req = http.request(options);

        req.on('response', (res) => { // Listen for the 'response' event
            if (res.statusCode < 200 || res.statusCode >= 300) {
                res.resume();
                settleOnce(reject, new Error(`Status Code: ${res.statusCode}`));
                return;
            }

            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                try {
                    const parsedData = json ? JSON.parse(responseData) : responseData;
                    settleOnce(resolve, parsedData);
                } catch (error) {
                    settleOnce(resolve, responseData);
                }
            });

            res.on('error', (err) => {
                settleOnce(reject, err);
            });
            res.on('close', () => {
                settleOnce(reject, new Error("Closed"));
            });
        });

        req.on('error', (err) => {
            settleOnce(reject, err);
        });
        req.on('close', () => {
            settleOnce(reject, new Error("Closed"));
        });

        if (data) {
            req.write(requestDataString);
        }

        req.end();
    });
}

function httpRequest({ uri, data = null, body = null, qs = null, method = 'GET', headers = null, json = true, timeout = 8000 }) {
    return new Promise((resolve, reject) => {
        data = data || body; // to be compatible with request package

        let settled = false;
        let options = {};

        // Atomic settlement helper to prevent race conditions
        const settleOnce = (settler, value) => {
            if (settled) {
                logger.warn('Security: Request handler - Attempted to settle promise multiple times', {
                    value: value instanceof Error ? value.message : (typeof value === 'object' && value.error ? value.error.message : 'data')
                });
                return false;
            }
            settled = true;
            settler(value);
            return true;
        };

        const requestDataString = data ? (json ? JSON.stringify(data) : data.toString()) : '';
        try {
            const urlObj = new URL(uri);

            options = {
                "hostname": urlObj.hostname,
                "port": urlObj.port,
                "path": urlObj.pathname + urlObj.search,
                "method": method.toUpperCase(),
                "headers": {
                    'Content-Type': json ? 'application/json' : 'application/x-www-form-urlencoded',
                    'Content-Length': data ? Buffer.byteLength(requestDataString) : 0,
                },
            };
            if (qs) {
                // Merge query parameters into the path
                const existingParams = new URLSearchParams(options.path.split('?')[1] || '');
                const mergedParams = new URLSearchParams();

                // Add existing params
                existingParams.forEach((value, key) => {
                    mergedParams.append(key, value);
                });

                // Add/override queryParams
                for (const key in qs) {
                    if (qs.hasOwnProperty(key)) {
                        mergedParams.set(key, qs[key]);
                    }
                }

                const queryString = mergedParams.toString();
                const basePath = options.path.split('?')[0];

                options.path = basePath + (queryString ? `?${queryString}` : '');
            }
            if (headers) {
                for (const key in headers) {
                    if (headers.hasOwnProperty(key)) {
                        options.headers[key] = headers[key];
                    }
                }
            }
        } catch (error) {
            settleOnce(reject, { error: error, body: null });
            return;
        }
        const req = http.request(options);

        req.on('response', (res) => { // Listen for the 'response' event
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                if (res.statusCode < 200 || res.statusCode >= 300) {
                    const error = new Error(`Status Code: ${res.statusCode}`);
                    try {
                        const parsedData = json ? JSON.parse(responseData) : responseData;
                        settleOnce(reject, { error: error, body: parsedData }); // Reject with error and data
                    } catch (parseError) {
                        settleOnce(reject, { error: error, body: responseData }); // Reject with error and raw data if parse fails
                    }
                    return;
                }

                try {
                    const parsedData = json ? JSON.parse(responseData) : responseData;
                    settleOnce(resolve, parsedData);
                } catch (parseError) {
                    settleOnce(resolve, responseData);
                }
            });

            res.on('close', () => {
                settleOnce(reject, { error: new Error("Closed"), body: null }); // Reject with error and null data for request errors
            });
            res.on('error', (error) => {
                settleOnce(reject, { error: error, body: null }); // Reject with error and null data for request errors
            });
        });

        req.on('close', () => {
            settleOnce(reject, { error: new Error("Closed"), body: null }); // Reject with error and null data for request errors
        });
        req.on('error', (error) => {
            settleOnce(reject, { error: error, body: null }); // Reject with error and null data for request errors
        });

        // Handle request timeout
        req.on('timeout', () => {
            req.destroy(); // IMPORTANT: Forcefully end the request
            settleOnce(reject, new Error('Request timed out'));
        });
        // Set the timeout on the request
        req.setTimeout(timeout);

        if (data) {
            req.write(requestDataString);
        }
        req.end();
    });
}

module.exports = { httpRequestLight, httpRequest };