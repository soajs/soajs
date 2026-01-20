# SOAJS Framework - System Architecture

## Overview

SOAJS is a Service-Oriented Architecture framework for Node.js that provides the foundation for building enterprise-grade microservices and daemons. It offers multi-tenant support, input validation, session management, service discovery, and seamless integration with the SOAJS ecosystem including the Controller Gateway.

```
                                    SOAJS Framework Architecture
                                    ============================

    ┌─────────────────────────────────────────────────────────────────────────────────────────┐
    │                              SOAJS CONTROLLER GATEWAY                                   │
    │                           (Proxies requests to services)                                │
    └───────────────────────────────────────────┬─────────────────────────────────────────────┘
                                                │
                    ┌───────────────────────────┼───────────────────────────┐
                    │                           │                           │
                    ▼                           ▼                           ▼
    ┌───────────────────────────┐  ┌───────────────────────────┐  ┌───────────────────────────┐
    │      REST SERVICE         │  │      REST SERVICE         │  │        DAEMON             │
    │     (Data Port)           │  │     (Data Port)           │  │   (Maintenance Port)      │
    │  ┌─────────────────────┐  │  │  ┌─────────────────────┐  │  │  ┌─────────────────────┐  │
    │  │  MIDDLEWARE STACK   │  │  │  │  MIDDLEWARE STACK   │  │  │  │    JOB EXECUTOR     │  │
    │  │                     │  │  │  │                     │  │  │  │                     │  │
    │  │  ┌───────────────┐  │  │  │  │  ┌───────────────┐  │  │  │  │  ┌───────────────┐  │  │
    │  │  │    soajs      │  │  │  │  │  │    soajs      │  │  │  │  │  │  Job Runner   │  │  │
    │  │  │  (init ctx)   │  │  │  │  │  │  (init ctx)   │  │  │  │  │  │ (cron/intrvl) │  │  │
    │  │  └───────────────┘  │  │  │  │  └───────────────┘  │  │  │  │  └───────────────┘  │  │
    │  │         │           │  │  │  │         │           │  │  │  │         │           │  │
    │  │         ▼           │  │  │  │         ▼           │  │  │  │         ▼           │  │
    │  │  ┌───────────────┐  │  │  │  │  ┌───────────────┐  │  │  │  │  ┌───────────────┐  │  │
    │  │  │   response    │  │  │  │  │  │   response    │  │  │  │  │  │ Job Handler   │  │  │
    │  │  │  (builders)   │  │  │  │  │  │  (builders)   │  │  │  │  │  │   (async)     │  │  │
    │  │  └───────────────┘  │  │  │  │  └───────────────┘  │  │  │  │  └───────────────┘  │  │
    │  │         │           │  │  │  │         │           │  │  │  │                     │  │
    │  │         ▼           │  │  │  │         ▼           │  │  │  └─────────────────────┘  │
    │  │  ┌───────────────┐  │  │  │  │  ┌───────────────┐  │  │  │                           │
    │  │  │  bodyParser   │  │  │  │  │  │  bodyParser   │  │  │  │  ┌─────────────────────┐  │
    │  │  │ (json/url)    │  │  │  │  │  │ (json/url)    │  │  │  │  │  MAINTENANCE PORT   │  │
    │  │  └───────────────┘  │  │  │  │  └───────────────┘  │  │  │  │                     │  │
    │  │         │           │  │  │  │         │           │  │  │  │  /heartbeat         │  │
    │  │         ▼           │  │  │  │         ▼           │  │  │  │  /reloadRegistry    │  │
    │  │  ┌───────────────┐  │  │  │  │  ┌───────────────┐  │  │  │  │  /loadProvision     │  │
    │  │  │ cookieParser  │  │  │  │  │  │ cookieParser  │  │  │  │  │  /daemonStats       │  │
    │  │  │  (optional)   │  │  │  │  │  │  (optional)   │  │  │  │  │  /reloadDaemonConf  │  │
    │  │  └───────────────┘  │  │  │  │  └───────────────┘  │  │  │  │                     │  │
    │  │         │           │  │  │  │         │           │  │  │  └─────────────────────┘  │
    │  │         ▼           │  │  │  │         ▼           │  │  │                           │
    │  │  ┌───────────────┐  │  │  │  │  ┌───────────────┐  │  │  └───────────────────────────┘
    │  │  │   session     │  │  │  │  │  │   session     │  │  │
    │  │  │ (MongoStore)  │  │  │  │  │  │ (MongoStore)  │  │  │
    │  │  └───────────────┘  │  │  │  │  └───────────────┘  │  │
    │  │         │           │  │  │  │         │           │  │
    │  │         ▼           │  │  │  │         ▼           │  │
    │  │  ┌───────────────┐  │  │  │  │  ┌───────────────┐  │  │
    │  │  │   inputmask   │  │  │  │  │  │   inputmask   │  │  │
    │  │  │    (IMFV)     │  │  │  │  │  │    (IMFV)     │  │  │
    │  │  └───────────────┘  │  │  │  │  └───────────────┘  │  │
    │  │         │           │  │  │  │         │           │  │
    │  │         ▼           │  │  │  │         ▼           │  │
    │  │  ┌───────────────┐  │  │  │  │  ┌───────────────┐  │  │
    │  │  │    service    │  │  │  │  │  │    service    │  │  │
    │  │  │  (MT/URAC)    │  │  │  │  │  │  (MT/URAC)    │  │  │
    │  │  └───────────────┘  │  │  │  │  └───────────────┘  │  │
    │  │                     │  │  │  │                     │  │
    │  └─────────────────────┘  │  └─────────────────────────┘  │
    │                           │                               │
    │  ┌─────────────────────┐  │  ┌─────────────────────────┐  │
    │  │  MAINTENANCE PORT   │  │  │  MAINTENANCE PORT       │  │
    │  │                     │  │  │                         │  │
    │  │  /heartbeat         │  │  │  /heartbeat             │  │
    │  │  /reloadRegistry    │  │  │  /reloadRegistry        │  │
    │  │  /resourceInfo      │  │  │  /resourceInfo          │  │
    │  └─────────────────────┘  │  └─────────────────────────┘  │
    │                           │                               │
    └───────────────────────────┴───────────────────────────────┘
                                    │
            ┌───────────────────────┼───────────────────────────┐
            │                       │                           │
            ▼                       ▼                           ▼
    ┌───────────────────┐  ┌───────────────────┐       ┌───────────────────┐
    │  CORE MODULES     │  │   DATA STORES     │       │  EXTERNAL DEPS    │
    │                   │  │                   │       │                   │
    │  soajs.core.libs  │  │  MongoDB          │       │  Express v5       │
    │  soajs.core.mods  │  │  (registry,       │       │  async            │
    │                   │  │   session,        │       │  cron             │
    │  • Registry       │  │   provision)      │       │  qs               │
    │  • Provision      │  │                   │       │  jsontoxml        │
    │  • Mongo          │  │                   │       │  merge            │
    │  • ES             │  │                   │       │                   │
    │  • Mail           │  │                   │       │                   │
    │  • Hasher         │  │                   │       │                   │
    │  • Authorization  │  │                   │       │                   │
    └───────────────────┘  └───────────────────┘       └───────────────────┘
```

---

## Component Descriptions

### 1. Main Entry Point (`index.js`)

The framework exports two server types and utility modules:

```javascript
module.exports = {
    "server": {
        "service": require("./servers/service.js"),  // REST Service Server
        "daemon": require("./servers/daemon.js")     // Background Daemon Server
    },
    "extractAPIsList": ...,   // API extraction utility
    "es": ...,                // Elasticsearch module
    "mail": ...,              // Mail module
    "mongo": ...,             // MongoDB module
    "hasher": ...,            // Password hashing
    "core": ...,              // Core utilities
    "authorization": ...,     // Authorization helpers
    "provision": ...,         // Provisioning module
    "utils": ...              // Utility functions
};
```

### 2. Server Types

#### REST Service Server (`servers/service.js`)

| Feature | Description |
|---------|-------------|
| **Express v5** | Built on latest Express with enhanced security |
| **Dual Ports** | Data port for API traffic, maintenance port for health checks |
| **Middleware Stack** | Configurable pipeline: soajs → response → bodyParser → cookieParser → session → inputmask → service |
| **Auto-Registration** | Automatically registers with SOAJS Controller for service discovery |
| **Swagger Support** | Optional swagger.yml endpoint at `/swagger` |
| **SOLO Mode** | Standalone operation without external key requirements |

#### Daemon Server (`servers/daemon.js`)

| Feature | Description |
|---------|-------------|
| **Job Scheduling** | Interval-based or Cron-based job execution |
| **Sequential/Parallel** | Configurable job processing order |
| **Multi-Tenant Jobs** | Jobs can run globally or per-tenant with external keys |
| **Job Statistics** | Tracks fastest/slowest execution times |
| **Daemon Groups** | Jobs grouped via `SOAJS_DAEMON_GRP_CONF` environment variable |

### 3. Middleware Pipeline

The service middleware processes requests in this order:

| Order | Middleware | File | Responsibility |
|-------|------------|------|----------------|
| 1 | **soajs** | `mw/soajs/index.js` | Initializes `req.soajs` context with registry, logger, meta, and validator |
| 2 | **response** | `mw/response/index.js` | Adds `buildResponse()` and `getError()` helper methods |
| 3 | **bodyParser** | Express built-in | Parses JSON/URL-encoded bodies with size limits (default 1MB) |
| 4 | **methodOverride** | npm package | Allows HTTP method override via headers |
| 5 | **cookieParser** | npm package | Parses cookies with secret from service configuration |
| 6 | **session** | express-session | Multi-tenant session management with MongoDB store |
| 7 | **inputmask** | `mw/inputmask/index.js` | Input Mapping, Formatting, and Validation (IMFV) |
| 8 | **service** | `mw/service/index.js` | Multi-tenant context, URAC integration, awareness helpers |

### 4. Core Classes

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                  CLASSES                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                        MultiTenantSession                                 │  │
│  ├──────────────────────────────────────────────────────────────────────────┤  │
│  │  • Session isolation per tenant and key                                  │  │
│  │  • Client info management (device, geo, extKey)                          │  │
│  │  • Service-specific session storage                                      │  │
│  │  • Session regeneration for security (prevents fixation attacks)         │  │
│  │  • Tenant session cleanup and preservation                               │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                             HTTP Extensions                               │  │
│  ├──────────────────────────────────────────────────────────────────────────┤  │
│  │  • getClientIP() - Extracts real client IP (handles X-Forwarded-For)     │  │
│  │  • getClientUserAgent() - Retrieves User-Agent header                    │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 5. Utilities

| Module | File | Purpose |
|--------|------|---------|
| **utils** | `utilities/utils.js` | API extraction, error handling middleware (logErrors, serviceClientErrorHandler, serviceErrorHandler) |
| **request** | `utilities/request.js` | HTTP request utilities with timeout support (httpRequest, httpRequestLight) |
| **logger** | `utilities/logger.js` | Secure logging with automatic PII redaction |
| **header** | `utilities/header.js` | Header value encoding/decoding utilities |

### 6. Registry Module

The local registry module (`modules/registry/local.js`) handles:

- Loading configuration from profile files
- Environment-based registry management
- Auto-registration with SOAJS Controller
- Custom registry access

---

## Request Flow

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                              SERVICE REQUEST FLOW                                │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   1. Request Arrives at Service Data Port                                        │
│      │                                                                           │
│      ▼                                                                           │
│   2. SOAJS Middleware (mw/soajs)                                                 │
│      • Initialize req.soajs object                                               │
│      • Attach registry, logger, meta, validator                                  │
│      │                                                                           │
│      ▼                                                                           │
│   3. Response Middleware (mw/response)                                           │
│      • Add buildResponse(error, data) helper                                     │
│      • Add getError(errorCode) helper                                            │
│      │                                                                           │
│      ▼                                                                           │
│   4. Body/Cookie/Session Parsing (if enabled)                                    │
│      • Parse JSON/URL-encoded body                                               │
│      • Parse cookies with secret                                                 │
│      • Initialize/restore session from MongoDB                                   │
│      │                                                                           │
│      ▼                                                                           │
│   5. Input Mask (IMFV) Middleware (mw/inputmask)                                 │
│      • Validate request against API schema                                       │
│      • Map inputs from multiple sources (query, body, headers, cookies, params)  │
│      • Format and sanitize data                                                  │
│      • Populate req.soajs.inputmaskData                                          │
│      │                                                                           │
│      ▼                                                                           │
│   6. Service Middleware (mw/service)                                             │
│      • Parse soajsinjectobj header from Controller                               │
│      • Extract tenant, key, application, package info                            │
│      • Setup awareness.getHost() and awareness.connect()                         │
│      • Initialize MultiTenantSession                                             │
│      • Setup URAC driver if enabled                                              │
│      │                                                                           │
│      ▼                                                                           │
│   7. Route Handler Execution                                                     │
│      • Access req.soajs.inputmaskData for validated inputs                       │
│      • Access req.soajs.tenant for tenant context                                │
│      • Access req.soajs.urac for user information                                │
│      • Use req.soajs.awareness for service discovery                             │
│      │                                                                           │
│      ▼                                                                           │
│   8. Response Building                                                           │
│      • Use req.soajs.buildResponse(error, data)                                  │
│      • Return via res.jsonp() or res.xml()                                       │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## Daemon Job Flow

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                DAEMON JOB FLOW                                   │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   1. Daemon Initialization                                                       │
│      • Load registry configuration                                               │
│      • Load provision data                                                       │
│      • Load daemon group configuration (SOAJS_DAEMON_GRP_CONF)                   │
│      │                                                                           │
│      ▼                                                                           │
│   2. Configure Daemon Type                                                       │
│      │                                                                           │
│      ├──► Interval Type: setTimeout with configurable interval                   │
│      │                   (default: 30 minutes)                                   │
│      │                                                                           │
│      └──► Cron Type: CronJob with cronTime and optional timezone                 │
│           (e.g., '00 30 11 * * 1-5')                                             │
│      │                                                                           │
│      ▼                                                                           │
│   3. Job Execution Cycle                                                         │
│      • Check daemon status (ON/OFF)                                              │
│      • Build jobs array based on configuration                                   │
│      │                                                                           │
│      ├──► Global Jobs: Single execution with global serviceConfig                │
│      │                                                                           │
│      └──► Tenant Jobs: Per-tenant execution with external keys                   │
│           • Resolve external key data                                            │
│           • Resolve package ACL                                                  │
│           • Build tenant context                                                 │
│      │                                                                           │
│      ▼                                                                           │
│   4. Job Processing                                                              │
│      │                                                                           │
│      ├──► Sequential: async.eachSeries() - jobs run in order                     │
│      │                                                                           │
│      └──► Parallel: async.each() - jobs run concurrently                         │
│      │                                                                           │
│      ▼                                                                           │
│   5. Statistics Tracking                                                         │
│      • Record execution timestamp                                                │
│      • Track fastest/slowest execution times per job                             │
│      • Update daemon state (fetching → executing → waiting)                      │
│      │                                                                           │
│      ▼                                                                           │
│   6. Reschedule (for interval type)                                              │
│      • setTimeout for next execution                                             │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## Input Mask (IMFV) System

The IMFV system provides comprehensive input validation:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           INPUT MASK (IMFV) SYSTEM                               │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   Input Sources (Priority Order):                                                │
│   ┌─────────────────────────────────────────────────────────────────────────┐    │
│   │  1. params     - URL path parameters (/user/:id)                        │    │
│   │  2. headers    - HTTP headers                                           │    │
│   │  3. query      - Query string parameters (?name=value)                  │    │
│   │  4. cookies    - Cookie values (if cookieParser enabled)                │    │
│   │  5. body       - Request body (if bodyParser enabled)                   │    │
│   └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│   Schema Definition:                                                             │
│   ┌─────────────────────────────────────────────────────────────────────────┐    │
│   │  {                                                                      │    │
│   │    "/api/endpoint": {                                                   │    │
│   │      "_apiInfo": { "l": "Label", "group": "Group" },                    │    │
│   │      "paramName": {                                                     │    │
│   │        "source": ["query", "body"],                                     │    │
│   │        "required": true,                                                │    │
│   │        "validation": { "type": "string", "format": "email" }            │    │
│   │      }                                                                  │    │
│   │    }                                                                    │    │
│   │  }                                                                      │    │
│   └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│   Validation Types:                                                              │
│   • string, integer, number, boolean, array, object                              │
│   • Formats: email, phone, datetime, alphanumeric, uri, etc.                     │
│   • Complex schemas with nested validation                                       │
│   • Custom format and type support                                               │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## Multi-Tenant Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                          MULTI-TENANT ARCHITECTURE                               │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐    │
│   │                      soajsinjectobj Header                               │    │
│   │   (Injected by Controller Gateway)                                       │    │
│   ├─────────────────────────────────────────────────────────────────────────┤    │
│   │                                                                         │    │
│   │  tenant: { id, code, locked, type, name, main, profile }                │    │
│   │  key: { config, iKey, eKey }                                            │    │
│   │  application: { product, package, appId, acl, acl_all_env }             │    │
│   │  package: { acl, acl_all_env }                                          │    │
│   │  device: { ... }                                                        │    │
│   │  geo: { ... }                                                           │    │
│   │  urac: { firstName, lastName, ... }                                     │    │
│   │  param: { ... }                                                         │    │
│   │  awareness: { host, port, interConnect[] }                              │    │
│   │                                                                         │    │
│   └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│   Session Structure:                                                             │
│   ┌─────────────────────────────────────────────────────────────────────────┐    │
│   │  session: {                                                             │    │
│   │    persistSession: {                                                    │    │
│   │      state: { ALL, TENANT, KEY, SERVICE, ... },                         │    │
│   │      holder: { tenant, product, request }                               │    │
│   │    },                                                                   │    │
│   │    sessions: {                                                          │    │
│   │      [tenantId]: {                                                      │    │
│   │        clientInfo: { device, geo, extKey },                             │    │
│   │        keys: {                                                          │    │
│   │          [key]: {                                                       │    │
│   │            services: { [serviceName]: { ... } }                         │    │
│   │          }                                                              │    │
│   │        }                                                                │    │
│   │      }                                                                  │    │
│   │    }                                                                    │    │
│   │  }                                                                      │    │
│   └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## Maintenance Endpoints

### Service Maintenance Port (Data Port + maintenance increment)

| Endpoint | Description |
|----------|-------------|
| `GET /heartbeat` | Health check - returns service status and version info |
| `GET /reloadRegistry` | Reloads registry configuration from database |
| `GET /resourceInfo` | Returns system resource information (CPU, memory, network) |

### Daemon Maintenance Port

| Endpoint | Description |
|----------|-------------|
| `GET /heartbeat` | Health check - returns daemon status |
| `GET /reloadRegistry` | Reloads registry configuration |
| `GET /loadProvision` | Reloads provisioning data |
| `GET /daemonStats` | Returns daemon execution statistics |
| `GET /reloadDaemonConf` | Reloads daemon group configuration |

---

## Security Features

| Feature | Implementation |
|---------|----------------|
| **ReDoS Protection** | safe-regex validation on user-provided patterns |
| **Prototype Pollution Prevention** | Guards against `__proto__`, `constructor`, `prototype` |
| **Request Size Limits** | Default 1MB body, 1000 parameter limit |
| **Session Fixation Prevention** | Session regeneration via `regenerateSession()` |
| **PII Redaction** | Automatic redaction in logs (passwords, tokens, cards) |
| **Graceful Shutdown** | 5-second cleanup timeout on fatal errors |
| **Race Condition Prevention** | Atomic promise settlement in HTTP handlers |

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `index.js` | Main entry point, exports server types and modules |
| `servers/service.js` | REST service server implementation |
| `servers/daemon.js` | Background daemon server implementation |
| `mw/soajs/index.js` | SOAJS context initialization middleware |
| `mw/response/index.js` | Response builder middleware |
| `mw/inputmask/index.js` | Input validation (IMFV) middleware |
| `mw/service/index.js` | Multi-tenant and URAC middleware |
| `classes/MultiTenantSession.js` | Multi-tenant session management class |
| `classes/http.js` | HTTP IncomingMessage extensions |
| `modules/registry/local.js` | Local registry loader |
| `utilities/utils.js` | API extraction and error handlers |
| `utilities/request.js` | HTTP request utilities |
| `utilities/logger.js` | Secure logging with PII redaction |

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SOAJS_ENV` | Environment name (dev, staging, production) |
| `SOAJS_SRVIP` | Service IP address override |
| `SOAJS_SRVPORT` | Service port override |
| `SOAJS_SRV_AUTOREGISTERHOST` | Enable/disable auto-registration with Controller |
| `SOAJS_DEPLOY_HA` | High-availability deployment mode |
| `SOAJS_DEPLOY_MANUAL` | Manual deployment mode |
| `SOAJS_PROFILE` | Path to registry profile file |
| `SOAJS_DAEMON_GRP_CONF` | Daemon group configuration name |
| `SOAJS_SOLO` | Run in standalone mode without external keys |

---

## Dependencies

### Runtime Dependencies

| Package | Purpose |
|---------|---------|
| `express` | Web framework (v5) |
| `async` | Asynchronous flow control |
| `cron` | Cron job scheduling |
| `qs` | Query string parsing with nested object support |
| `cookie-parser` | Cookie parsing |
| `express-session` | Session management |
| `method-override` | HTTP method override |
| `jsontoxml` | JSON to XML conversion |
| `merge` | Object merging |
| `safe-regex` | ReDoS protection |
| `soajs.core.libs` | Core utility library |
| `soajs.core.modules` | Core modules (registry, provision, mongo, etc.) |

---

## Summary

The SOAJS Framework provides a comprehensive foundation for building enterprise microservices:

- **Dual Server Architecture**: REST services and background daemons
- **Multi-Tenant Support**: Full tenant isolation with configurable ACLs
- **Input Validation**: Powerful IMFV system for schema-based validation
- **Session Management**: Multi-tenant sessions with MongoDB persistence
- **Service Discovery**: Automatic registration and awareness helpers
- **Security**: Modern security features including ReDoS protection, PII redaction
- **Maintainability**: Health checks, registry reload, resource monitoring
- **Extensibility**: Modular middleware architecture with optional components
