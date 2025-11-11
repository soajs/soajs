# Security Documentation

This document outlines the security features, improvements, and best practices implemented in SOAJS framework v4.1.18+.

## Table of Contents

1. [Security Features](#security-features)
2. [Security Improvements](#security-improvements)
3. [Security Best Practices](#security-best-practices)
4. [Vulnerability Reporting](#vulnerability-reporting)
5. [Security Architecture](#security-architecture)

---

## Security Features

### 1. Input Validation & Protection

#### ReDoS (Regular Expression Denial of Service) Protection
**Location:** `mw/inputmask/inputmask.js`

SOAJS now validates all regex patterns using the `safe-regex` library to prevent catastrophic backtracking attacks.

**Features:**
- Validates regex patterns before compilation
- Checks pattern complexity (max 500 characters)
- Detects dangerous nested quantifiers like `(a+)+` or `(\w+[*+]){2,}`
- Automatically blocks unsafe patterns with security logging

**Example:**
```javascript
// These patterns are automatically blocked:
(a+)+          // Nested quantifiers
(x+x+)+        // Multiple consecutive quantifiers
(a*)*b         // Nested star quantifiers
```

#### Prototype Pollution Protection
**Location:** `mw/inputmask/inputmask.js`

All object property assignments are protected against prototype pollution attacks.

**Protected Keys:**
- `__proto__`
- `constructor`
- `prototype`

**Protection Points:**
- Common field merging (line 72)
- Object validation (lines 166, 198)
- Parameter mapping (line 318)

**Example:**
```javascript
// This malicious input is automatically blocked:
{
  "__proto__": { "isAdmin": true },
  "constructor": { "prototype": { "isAdmin": true } }
}
```

### 2. Request Handling Security

#### Race Condition Prevention
**Location:** `utilities/request.js`

HTTP request handlers use atomic promise settlement to prevent race conditions in event-driven environments.

**Implementation:**
- Single-use settlement flags
- Atomic `settleOnce()` helper function
- Logged attempts at multiple settlements
- Prevents promise state corruption

**Example Log:**
```
Security: Request handler - Attempted to settle promise multiple times
```

#### Request Size Limits (DoS Prevention)
**Location:** `servers/service.js`

**Default Limits:**
- Body size: 1MB (configurable)
- Parameter count: 1000 max
- Strict JSON parsing enabled

**Configuration:**
```javascript
{
  bodyParser: {
    limit: '1mb'  // Customize as needed
  }
}
```

### 3. Session Security

#### Session Fixation Prevention
**Location:** `classes/MultiTenantSession.js`

A new `regenerateSession()` method prevents session fixation attacks by regenerating session IDs after authentication.

**Usage:**
```javascript
// Call after successful authentication
req.soajs.session.regenerateSession((err) => {
  if (err) {
    // Handle error
  }
  // Session ID has been regenerated
});
```

**Best Practice:**
Always regenerate the session ID after:
- Successful login
- Privilege escalation
- Significant account changes

### 4. Secure Logging

#### Automatic Sensitive Data Redaction
**Location:** `utilities/logger.js`

All log output automatically redacts sensitive information.

**Redacted Fields (25+ patterns):**
- Passwords: `password`, `passwd`, `pass`, `pwd`
- Tokens: `token`, `access_token`, `refresh_token`, `apikey`, `api_key`
- Authentication: `authorization`, `auth`, `key`
- Session Data: `session`, `sessionid`, `cookie`
- Payment Info: `credit_card`, `cvv`
- PII: `ssn`, `social_security`

**Features:**
- Automatic PII detection and redaction
- Pattern-based sensitive data detection (emails, credit cards, etc.)
- Safe error object logging
- Circular reference handling
- Maximum depth protection

**Example:**
```javascript
logger.info('User login', {
  username: 'john',
  password: 'secret123',  // Logged as [REDACTED]
  email: 'john@example.com'  // Pattern redacted
});
```

### 5. Error Handling

#### Graceful Shutdown on Fatal Errors
**Location:** `index.js`

**Features:**
- 5-second graceful shutdown timeout
- Cleanup event emission (`SOAJS_SHUTDOWN`)
- Prevents cascade failures
- Automatic unhandled rejection handling

**Event Flow:**
```
Uncaught Exception → Log Error → Emit SOAJS_SHUTDOWN → 5s Timeout → Force Exit
```

#### Safe JSON Parsing
**Location:** `mw/service/index.js`

All JSON parsing operations are wrapped in try-catch blocks with security logging.

**Example:**
```javascript
try {
  data = JSON.parse(input);
} catch (e) {
  logger.error('Security: Malformed JSON in soajsinjectobj header', {
    error: e.message
  });
  return null;
}
```

---

## Security Improvements

### Version 4.1.18+ Security Enhancements

#### Critical Fixes (5)
1. **ReDoS Vulnerability** - Added safe-regex validation for all user-provided regex patterns
2. **Prototype Pollution** - Protected 7+ code locations against prototype pollution attacks
3. **JSON Parse Errors** - Added error handling to prevent process crashes from malformed JSON
4. **Memory Leak** - Fixed timer cleanup in registry auto-reload mechanism
5. **Uncaught Exceptions** - Implemented graceful shutdown with cleanup timeout

#### High Priority Fixes (6)
1. **Race Conditions** - Fixed non-atomic promise settlement in HTTP request handlers
2. **Null Pointer Crashes** - Added message validation in response error handlers
3. **DoS via Large Payloads** - Implemented default 1MB limit and 1000 parameter limit
4. **Session Fixation** - Added session regeneration capability
5. **Empty Catch Blocks** - Added security logging in error handlers
6. **Outdated Dependencies** - Updated 31 packages, fixed 16 vulnerabilities

#### Dependency Updates
- **Express:** Upgraded from v4.21.2 to v5.1.0
  - Fixed wildcard route syntax (`'*'` → `'/*path'`)
  - Added middleware for Express v5 compatibility (`req.body`, `req.cookies` initialization)
- **Request Package:** Replaced deprecated `request` with `axios` v1.13.2
- **Security:** Added `safe-regex` v2.1.1 for ReDoS protection

---

## Security Best Practices

### For Service Developers

#### 1. Input Validation
Always define input schemas for your APIs:

```javascript
schema: {
  "/api/user": {
    user: {
      required: true,
      source: ['body.user'],
      validation: {
        type: 'string',
        minLength: 3,
        maxLength: 50
      }
    }
  }
}
```

#### 2. Session Management
Regenerate sessions after authentication:

```javascript
// After successful login
mtSession.regenerateSession((err) => {
  if (err) {
    return callback(err);
  }
  // Proceed with authenticated session
});
```

#### 3. Error Handling
Never expose internal errors to clients:

```javascript
try {
  // Business logic
} catch (err) {
  req.soajs.log.error('Internal error:', err);
  return res.json(req.soajs.buildResponse({
    code: 500,
    msg: 'An error occurred'
  }));
}
```

#### 4. Logging
Use the secure logger to prevent sensitive data leaks:

```javascript
const logger = require('./utilities/logger');

logger.info('User action', {
  userId: user.id,
  action: 'update',
  password: 'secret'  // Automatically redacted
});
```

### For Administrators

#### 1. Environment Configuration
- Use environment variables for secrets
- Never commit credentials to version control
- Rotate keys and tokens regularly

#### 2. Security Headers
The SOAJS controller handles security headers. Ensure your controller is configured with:
- HTTPS/SSL termination
- CORS policies
- Rate limiting
- Security headers (X-Frame-Options, CSP, etc.)

#### 3. Monitoring
Enable security logging and monitor for:
- Failed authentication attempts
- Prototype pollution attempts
- ReDoS attack patterns
- Unusual traffic patterns

---

## Vulnerability Reporting

If you discover a security vulnerability in SOAJS, please report it responsibly:

1. **Do not** open a public GitHub issue
2. Email security concerns to: team@soajs.org
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if available)

We will respond to security reports within 48 hours and work with you to address the issue.

---

## Security Architecture

### Defense in Depth

SOAJS implements multiple layers of security:

```
┌─────────────────────────────────────┐
│      SOAJS Controller (Edge)        │
│  - HTTPS/SSL Termination            │
│  - CORS Policies                    │
│  - Rate Limiting                    │
│  - Security Headers                 │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│      Service Layer (Internal)       │
│  - Input Validation (IMFV)          │
│  - ReDoS Protection                 │
│  - Prototype Pollution Prevention   │
│  - Session Management               │
│  - Authentication/Authorization     │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│      Business Logic                 │
│  - Secure Logging                   │
│  - Error Handling                   │
│  - Race Condition Prevention        │
└─────────────────────────────────────┘
```

### Security Components

#### 1. Edge Security (Controller)
- Terminates SSL/TLS connections
- Enforces CORS policies
- Implements rate limiting
- Adds security headers

#### 2. Service Security (Microservices)
- Validates all inputs with IMFV
- Protects against injection attacks
- Manages sessions securely
- Enforces authentication/authorization

#### 3. Application Security (Business Logic)
- Logs securely without exposing PII
- Handles errors gracefully
- Prevents race conditions
- Manages resources safely

---

## Security Testing

### Automated Security Tests

SOAJS includes automated security tests:

```bash
npm test
```

**Test Coverage:**
- ReDoS attack patterns (4 tests)
- Prototype pollution attempts (3 tests)
- Race condition scenarios (8 tests)
- Session security (2 tests)
- Input validation (40+ tests)

**Security Test Locations:**
- `test/unit/mw/inputmask/redos-fix.js`
- `test/unit/mw/inputmask/prototype-pollution-fix.js`
- `test/manual/test-race-conditions.js`
- `test/manual/test-session-regeneration.js`

### Manual Security Testing

For manual security testing, use the test utilities in `test/manual/`:

```bash
node test/manual/test-redos-fix.js
node test/manual/test-prototype-pollution.js
node test/manual/test-race-conditions.js
node test/manual/test-session-regeneration.js
```

---

## Compliance

### Standards & Best Practices

SOAJS security implementation follows:

- **OWASP Top 10** - Protection against common web vulnerabilities
- **CWE Top 25** - Common Weakness Enumeration mitigations
- **NIST Guidelines** - Secure coding practices
- **Node.js Security Best Practices** - Platform-specific security

### Security Certifications

For compliance documentation and security audit reports, contact: team@soajs.org

---

## Version History

### v4.1.18+
- Added ReDoS protection with safe-regex
- Implemented prototype pollution prevention
- Added graceful shutdown on fatal errors
- Fixed race conditions in HTTP handlers
- Added secure logger with automatic PII redaction
- Fixed session fixation vulnerability
- Added DoS protection via request limits
- Upgraded to Express v5.1.0
- Replaced deprecated request package with axios

---

## Additional Resources

- [SOAJS Website](https://www.soajs.org)
- [OWASP Security Guidelines](https://owasp.org/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

---

**Last Updated:** 2025-11-11
**Security Contact:** team@soajs.org
