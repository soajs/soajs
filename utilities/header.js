"use strict";

/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */

const logger = require("./logger");

/**
 * Encodes a string to be safely used as an HTTP header value.
 * This preserves all data and is the standard, recommended method.
 *
 * @param {string | number | boolean} value The value to encode.
 * @returns {string} The URL-encoded string.
 */
function encodeHeaderValue(value) {
    if (value === null || typeof value === 'undefined') {
        return '';
    }
    return encodeURIComponent(String(value));
}

/**
 * Decodes a URL-encoded string from an HTTP header.
 * It safely handles potential errors if the input is malformed.
 *
 * @param {string} encodedValue The percent-encoded header value to decode.
 * @returns {string} The decoded (original) string, or the original
 * string if decoding fails.
 */
function decodeHeaderValue(encodedValue) {
    // Return empty string or null as is, to avoid errors.
    if (!encodedValue) {
        return encodedValue;
    }

    try {
        // The standard way to decode a value encoded by encodeURIComponent.
        return decodeURIComponent(encodedValue);
    } catch (e) {
        // This catches errors from malformed URI sequences (e.g., a lone '%').
        // Logger automatically redacts sensitive data
        logger.error('Failed to decode header value', {
            error: e.message,
            hasValue: !!encodedValue
        });
        // Return the original, undecoded value so the app doesn't crash.
        return encodedValue;
    }
}

module.exports = { encodeHeaderValue, decodeHeaderValue };