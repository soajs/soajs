# SOAJS Security Best Practices Guide

A comprehensive guide for developers building secure microservices with SOAJS.

## Table of Contents

1. [Service Development](#service-development)
2. [Input Validation](#input-validation)
3. [Authentication & Authorization](#authentication--authorization)
4. [Session Management](#session-management)
5. [Error Handling](#error-handling)
6. [Logging](#logging)
7. [Configuration Management](#configuration-management)
8. [Testing](#testing)

---

## Service Development

### Secure Service Structure

```javascript
'use strict';

const soajs = require('soajs');
const config = require('./config.js');

// Initialize service
const service = new soajs.server.service(config);

// Initialize with proper error handling
service.init((err) => {
  if (err) {
    console.error('Service initialization failed:', err);
    process.exit(1);
  }

  // Define routes with input validation
  service.get('/api/users/:id', (req, res) => {
    // Business logic here
    // Input is already validated by IMFV
    const userId = req.soajs.inputmaskData.id;

    // Use secure logger
    req.soajs.log.info('Fetching user', { userId });

    // Return response
    res.json(req.soajs.buildResponse(null, userData));
  });

  // Start service
  service.start((err) => {
    if (err) {
      console.error('Service start failed:', err);
      process.exit(1);
    }
  });
});
```

---

## Input Validation

### Always Define Input Schemas

**Bad Practice:**
```javascript
service.post('/api/user', (req, res) => {
  // Directly using req.body is unsafe
  const username = req.body.username;
  const email = req.body.email;
  // ...
});
```

**Good Practice:**
```javascript
// In config.js
schema: {
  '/api/user': {
    username: {
      required: true,
      source: ['body.username'],
      validation: {
        type: 'string',
        minLength: 3,
        maxLength: 50,
        pattern: /^[a-zA-Z0-9_]+$/
      }
    },
    email: {
      required: true,
      source: ['body.email'],
      validation: {
        type: 'string',
        format: 'email'
      }
    },
    age: {
      required: false,
      source: ['body.age'],
      default: 0,
      validation: {
        type: 'integer',
        minimum: 0,
        maximum: 150
      }
    }
  }
}

// In service route
service.post('/api/user', (req, res) => {
  // Data is validated and formatted by IMFV
  const data = req.soajs.inputmaskData;
  // data.username, data.email, data.age are safe to use
});
```

### Complex Object Validation

```javascript
schema: {
  '/api/order': {
    customer: {
      required: true,
      source: ['body.customer'],
      validation: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1 },
          email: { type: 'string', format: 'email' },
          address: {
            type: 'object',
            properties: {
              street: { type: 'string' },
              city: { type: 'string' },
              zipCode: { type: 'string', pattern: /^\d{5}$/ }
            },
            required: ['street', 'city', 'zipCode']
          }
        },
        required: ['name', 'email']
      }
    },
    items: {
      required: true,
      source: ['body.items'],
      validation: {
        type: 'array',
        minItems: 1,
        maxItems: 100,
        items: {
          type: 'object',
          properties: {
            productId: { type: 'string' },
            quantity: { type: 'integer', minimum: 1 }
          },
          required: ['productId', 'quantity']
        }
      }
    }
  }
}
```

### Sanitizing User Input

```javascript
// SOAJS automatically sanitizes input based on validation type
// Additional sanitization for special cases:

const sanitizeHtml = (input) => {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

service.post('/api/comment', (req, res) => {
  let comment = req.soajs.inputmaskData.comment;

  // Sanitize HTML if displaying in UI
  comment = sanitizeHtml(comment);

  // Process comment...
});
```

---

## Authentication & Authorization

### Requiring Authentication

```javascript
// In config.js
{
  serviceName: 'myservice',
  extKeyRequired: true,  // Require external key
  oauth: true,           // Require OAuth token
  // ...
}
```

### Checking User Permissions

```javascript
service.get('/api/admin/users', (req, res) => {
  // Check if user is authenticated
  if (!req.soajs.urac) {
    return res.json(req.soajs.buildResponse({
      code: 401,
      msg: 'Unauthorized'
    }));
  }

  // Check user role/group
  if (!req.soajs.uracDriver || !req.soajs.uracDriver.getAcl()) {
    return res.json(req.soajs.buildResponse({
      code: 403,
      msg: 'Forbidden'
    }));
  }

  // Check specific permission
  const hasPermission = req.soajs.uracDriver.getAcl().hasAccess(
    'admin',
    'users',
    'list'
  );

  if (!hasPermission) {
    return res.json(req.soajs.buildResponse({
      code: 403,
      msg: 'Insufficient permissions'
    }));
  }

  // User is authorized, proceed with operation
  // ...
});
```

### Custom Authorization Logic

```javascript
const checkResourceOwnership = (req, resourceOwnerId) => {
  const userId = req.soajs.urac && req.soajs.urac._id;
  return userId && userId.toString() === resourceOwnerId.toString();
};

service.put('/api/profile/:id', (req, res) => {
  const profileId = req.soajs.inputmaskData.id;

  // Check if user owns this profile or is admin
  const isOwner = checkResourceOwnership(req, profileId);
  const isAdmin = req.soajs.uracDriver &&
                  req.soajs.uracDriver.getAcl().hasAccess('admin');

  if (!isOwner && !isAdmin) {
    return res.json(req.soajs.buildResponse({
      code: 403,
      msg: 'Cannot modify another user\'s profile'
    }));
  }

  // Authorized, proceed with update
  // ...
});
```

---

## Session Management

### Regenerate Session After Login

```javascript
service.post('/auth/login', (req, res) => {
  const { username, password } = req.soajs.inputmaskData;

  // Validate credentials
  authenticateUser(username, password, (err, user) => {
    if (err || !user) {
      return res.json(req.soajs.buildResponse({
        code: 401,
        msg: 'Invalid credentials'
      }));
    }

    // IMPORTANT: Regenerate session to prevent session fixation
    req.soajs.session.regenerateSession((err) => {
      if (err) {
        req.soajs.log.error('Session regeneration failed', { error: err });
        return res.json(req.soajs.buildResponse({
          code: 500,
          msg: 'Login failed'
        }));
      }

      // Store user data in session
      req.soajs.session.setSERVICE({
        userId: user._id,
        username: user.username,
        role: user.role
      }, (err) => {
        if (err) {
          return res.json(req.soajs.buildResponse({
            code: 500,
            msg: 'Session creation failed'
          }));
        }

        res.json(req.soajs.buildResponse(null, {
          message: 'Login successful'
        }));
      });
    });
  });
});
```

### Secure Session Data

```javascript
// Store only necessary data in session
service.post('/auth/login', (req, res) => {
  // ... after authentication ...

  // BAD: Storing sensitive data
  req.soajs.session.setSERVICE({
    password: user.password,        // NEVER store passwords
    creditCard: user.creditCard,    // NEVER store payment info
    ssn: user.ssn                   // NEVER store PII
  });

  // GOOD: Store only identifiers and non-sensitive data
  req.soajs.session.setSERVICE({
    userId: user._id,
    username: user.username,
    role: user.role,
    loginTime: Date.now()
  });
});
```

### Session Timeout

```javascript
// In config.js
{
  session: true,
  requestTimeout: 1800,        // 30 minutes
  requestTimeoutRenewal: 300,  // Renew if activity within 5 minutes
}

// Check session validity
service.get('/api/data', (req, res) => {
  const session = req.soajs.session.getSERVICE();

  if (!session || !session.userId) {
    return res.json(req.soajs.buildResponse({
      code: 401,
      msg: 'Session expired'
    }));
  }

  // Session is valid, proceed
  // ...
});
```

---

## Error Handling

### Never Expose Internal Errors

**Bad Practice:**
```javascript
service.get('/api/user/:id', (req, res) => {
  database.findUser(id, (err, user) => {
    if (err) {
      // NEVER expose internal error details
      return res.json({
        error: err.message,
        stack: err.stack,
        query: err.query
      });
    }
    // ...
  });
});
```

**Good Practice:**
```javascript
service.get('/api/user/:id', (req, res) => {
  const userId = req.soajs.inputmaskData.id;

  database.findUser(userId, (err, user) => {
    if (err) {
      // Log detailed error internally
      req.soajs.log.error('Database query failed', {
        userId,
        error: err.message,
        stack: err.stack
      });

      // Return generic error to client
      return res.json(req.soajs.buildResponse({
        code: 500,
        msg: 'Failed to fetch user'
      }));
    }

    if (!user) {
      return res.json(req.soajs.buildResponse({
        code: 404,
        msg: 'User not found'
      }));
    }

    res.json(req.soajs.buildResponse(null, user));
  });
});
```

### Consistent Error Responses

```javascript
// Define error codes in config.js
errors: {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  500: 'Internal Server Error',
  1001: 'Invalid user credentials',
  1002: 'User account locked',
  1003: 'Email already exists'
}

// Use consistent error responses
service.post('/api/user', (req, res) => {
  const { email } = req.soajs.inputmaskData;

  checkEmailExists(email, (err, exists) => {
    if (err) {
      return res.json(req.soajs.buildResponse({
        code: 500,
        msg: 'Failed to validate email'
      }));
    }

    if (exists) {
      return res.json(req.soajs.buildResponse({
        code: 1003
      }));
    }

    // Proceed with user creation
    // ...
  });
});
```

### Try-Catch for Synchronous Code

```javascript
service.post('/api/data', (req, res) => {
  try {
    const data = req.soajs.inputmaskData.data;

    // Parse complex data structure
    const parsed = JSON.parse(data);
    const processed = complexProcessing(parsed);

    res.json(req.soajs.buildResponse(null, processed));
  } catch (err) {
    req.soajs.log.error('Data processing failed', {
      error: err.message
    });

    res.json(req.soajs.buildResponse({
      code: 400,
      msg: 'Invalid data format'
    }));
  }
});
```

---

## Logging

### Use Secure Logger

```javascript
const logger = require('soajs/utilities/logger');

// Instead of console.log/error/warn
service.get('/api/login', (req, res) => {
  const { username, password } = req.soajs.inputmaskData;

  // GOOD: Secure logger automatically redacts sensitive data
  logger.info('Login attempt', {
    username,
    password,  // Automatically redacted
    ip: req.ip
  });

  // BAD: console.log exposes sensitive data
  console.log('Login:', { username, password });
});
```

### What to Log

**Security Events (Always Log):**
```javascript
// Authentication events
logger.info('User login successful', { userId, ip });
logger.warn('Failed login attempt', { username, ip });
logger.error('Account locked', { userId, reason });

// Authorization events
logger.warn('Unauthorized access attempt', { userId, resource, action });

// Input validation failures
logger.warn('Invalid input detected', { field, value });

// Security attacks
logger.error('Prototype pollution attempt blocked', { key });
logger.error('ReDoS pattern blocked', { pattern });
```

**Application Events (Selective Logging):**
```javascript
// Business logic
logger.info('Order created', { orderId, userId });
logger.info('Payment processed', { orderId, amount });

// System events
logger.info('Database connection established');
logger.error('External API timeout', { service, timeout });
```

### Log Levels

```javascript
// Use appropriate log levels
logger.debug('Entering function', { params });  // Development only
logger.info('Normal operation', { data });      // Production info
logger.warn('Unusual condition', { condition }); // Potential issues
logger.error('Operation failed', { error });    // Errors requiring attention
```

### Structured Logging

```javascript
// GOOD: Structured logging with context
logger.info('User action', {
  action: 'update_profile',
  userId: user._id,
  changes: ['email', 'phone'],
  timestamp: Date.now()
});

// BAD: Unstructured logging
logger.info('User updated profile with email and phone');
```

---

## Configuration Management

### Never Hardcode Secrets

**Bad Practice:**
```javascript
// NEVER do this
const config = {
  database: {
    host: 'prod-db.example.com',
    password: 'hardcoded-password-123'
  },
  apiKey: 'sk_live_abc123xyz'
};
```

**Good Practice:**
```javascript
// Use environment variables
const config = {
  database: {
    host: process.env.DB_HOST,
    password: process.env.DB_PASSWORD
  },
  apiKey: process.env.API_KEY
};

// Validate required environment variables
const requiredEnvVars = ['DB_HOST', 'DB_PASSWORD', 'API_KEY'];
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    throw new Error(`Required environment variable ${varName} is not set`);
  }
});
```

### Environment-Specific Configuration

```javascript
const env = process.env.SOAJS_ENV || 'dev';

const config = {
  development: {
    database: {
      host: 'localhost',
      name: 'dev_db'
    },
    debug: true
  },
  production: {
    database: {
      host: process.env.DB_HOST,
      name: 'prod_db'
    },
    debug: false
  }
};

module.exports = config[env];
```

### Secure Configuration Storage

```javascript
// Use SOAJS service configuration
{
  serviceName: 'myservice',
  // Configuration stored in registry, not in code
  // Access via: req.soajs.servicesConfig
}

service.get('/api/data', (req, res) => {
  // Access service-specific configuration
  const serviceConfig = req.soajs.servicesConfig;
  const apiKey = serviceConfig.externalApi.apiKey;

  // Use configuration securely
  // ...
});
```

---

## Testing

### Security Test Cases

```javascript
// test/security/input-validation.test.js
describe('Input Validation Security', () => {

  it('should block prototype pollution attempts', (done) => {
    const maliciousInput = {
      username: 'test',
      '__proto__': { isAdmin: true }
    };

    requester('post', {
      uri: 'http://localhost:4000/api/user',
      body: maliciousInput
    }, (err, response) => {
      assert.ok(response);
      assert.equal(response.hasOwnProperty('__proto__'), false);
      done();
    });
  });

  it('should block ReDoS patterns', (done) => {
    const maliciousPattern = '(a+)+';

    requester('post', {
      uri: 'http://localhost:4000/api/search',
      body: { pattern: maliciousPattern }
    }, (err, response) => {
      assert.ok(response);
      // Should complete without timeout
      done();
    });
  });

  it('should validate input types', (done) => {
    requester('post', {
      uri: 'http://localhost:4000/api/user',
      body: {
        age: 'not-a-number'  // Should fail validation
      }
    }, (err, response) => {
      assert.ok(response.errors);
      done();
    });
  });
});
```

### Authentication Testing

```javascript
describe('Authentication Security', () => {

  it('should require authentication', (done) => {
    requester('get', {
      uri: 'http://localhost:4000/api/protected',
      public: true  // No auth token
    }, (err, response) => {
      assert.equal(response.errors.codes[0], 401);
      done();
    });
  });

  it('should regenerate session after login', (done) => {
    let initialSessionId;

    // Get initial session
    requester('get', {
      uri: 'http://localhost:4000/api/session',
      public: true
    }, (err, response) => {
      initialSessionId = response.sessionId;

      // Login
      requester('post', {
        uri: 'http://localhost:4000/auth/login',
        body: { username: 'test', password: 'test' }
      }, (err, response) => {
        const newSessionId = response.sessionId;

        // Session ID should have changed
        assert.notEqual(initialSessionId, newSessionId);
        done();
      });
    });
  });
});
```

### Load Testing for DoS Protection

```javascript
describe('DoS Protection', () => {

  it('should reject oversized payloads', (done) => {
    const largePayload = 'a'.repeat(2 * 1024 * 1024); // 2MB

    requester('post', {
      uri: 'http://localhost:4000/api/data',
      body: { data: largePayload }
    }, (err, response) => {
      assert.ok(err || response.errors);
      done();
    });
  });

  it('should handle many concurrent requests', (done) => {
    const requests = [];

    for (let i = 0; i < 100; i++) {
      requests.push((cb) => {
        requester('get', {
          uri: 'http://localhost:4000/api/data'
        }, cb);
      });
    }

    async.parallel(requests, (err, results) => {
      // All requests should complete successfully
      assert.equal(results.length, 100);
      done();
    });
  });
});
```

---

## Additional Resources

- [SOAJS Security Documentation](../SECURITY.md)
- [SOAJS Changelog](../CHANGELOG.md)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

---

**For security issues, contact:** team@soajs.org
