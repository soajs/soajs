"use strict";

/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */

const http = require('http');

function httpRequestLight({ uri, data = null, qs = null, method = 'GET', headers = null, json = true }) {
    return new Promise((resolve, reject) => {
        let onResponse = false;
        let options = {};
        const requestDataString = data ? (json ? JSON.stringify(data) : data.toString()) : '';

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
            if (!onResponse) {
                onResponse = true;
                return reject(error); // Reject with error and null data for request errors
            }
        }

        const req = http.request(options);

        req.on('response', (res) => { // Listen for the 'response' event
            if (res.statusCode < 200 || res.statusCode >= 300) {
                return reject(new Error(`Status Code: ${res.statusCode}`));
            }

            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {

                if (!onResponse) {
                    onResponse = true;
                    try {
                        const parsedData = json ? JSON.parse(responseData) : responseData;
                        return resolve(parsedData);
                    } catch (error) {
                        return resolve(responseData);
                    }
                }
            });

            res.on('error', (err) => {
                if (!onResponse) {
                    onResponse = true;
                    return reject(err);
                }
            });
            res.on('close', () => {
                if (!onResponse) {
                    onResponse = true;
                    return reject(new Error("Closed"));
                }
            });
        });

        req.on('error', (err) => {
            if (!onResponse) {
                onResponse = true;
                return reject(err);
            }
        });
        req.on('close', () => {
            if (!onResponse) {
                onResponse = true;
                return reject(new Error("Closed"));
            }
        });

        if (data) {
            req.write(requestDataString);
        }

        req.end();
    });
}

function httpRequest({ uri, data = null, qs = null, method = 'GET', headers = null, json = true }) {
    return new Promise((resolve, reject) => {
        let onResponse = false;
        let options = {};

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
            if (!onResponse) {
                onResponse = true;
                return reject({ error: error, body: null }); // Reject with error and null data for request errors
            }
        }
        const req = http.request(options);

        req.on('response', (res) => { // Listen for the 'response' event
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                if (!onResponse) {
                    onResponse = true;
                    if (res.statusCode < 200 || res.statusCode >= 300) {
                        const error = new Error(`Status Code: ${res.statusCode}`);
                        try {
                            const parsedData = json ? JSON.parse(responseData) : responseData;
                            return reject({ error: error, body: parsedData }); // Reject with error and data
                        } catch (parseError) {
                            return reject({ error: error, body: responseData }); // Reject with error and raw data if parse fails
                        }
                    }

                    try {
                        const parsedData = json ? JSON.parse(responseData) : responseData;
                        return resolve(parsedData);
                    } catch (parseError) {
                        return resolve(responseData);
                    }
                }
            });

            res.on('close', () => {
                if (!onResponse) {
                    onResponse = true;
                    return reject({ error: new Error("Closed"), body: null }); // Reject with error and null data for request errors
                }
            });
            res.on('error', (error) => {
                if (!onResponse) {
                    onResponse = true;
                    return reject({ error: error, body: null }); // Reject with error and null data for request errors
                }
            });
        });

        req.on('close', () => {
            if (!onResponse) {
                onResponse = true;
                return reject({ error: new Error("Closed"), body: null }); // Reject with error and null data for request errors
            }
        });
        req.on('error', (error) => {
            if (!onResponse) {
                onResponse = true;
                return reject({ error: error, body: null }); // Reject with error and null data for request errors
            }
        });

        if (data) {
            req.write(requestDataString);
        }
        req.end();
    });
}

module.exports = { httpRequestLight, httpRequest };