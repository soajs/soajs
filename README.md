# soajs
[![Build Status](https://travis-ci.org/soajs/soajs.svg?branch=master)](https://travis-ci.org/soajs/soajs)
[![Coverage Status](https://coveralls.io/repos/soajs/soajs/badge.png)](https://coveralls.io/r/soajs/soajs)
[![Known Vulnerabilities](https://snyk.io/test/github/soajs/soajs/badge.svg)](https://snyk.io/test/github/soajs/soajs)
[![Gitter](https://badges.gitter.im/soajs/soajs.svg)](https://gitter.im/soajs/soajs?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=body_badge)

SOAJS is an open source dream framework that empowers building crazy fast the API-nization layer between the product frontend (UI/UX) and backend (business logic).

## Some of soajs advantages:
* Develop enterprise-grade APIs that are super fast, secured by design, scalable and multitenant.
* Focus on building your product without wasting your time building the api layer and end up stuck maintaining it.
* Standardize your APIs from day one while giving full flexibility to engineers to code the business logic layer as well as UI/UX layer.
* Create homogeneity and never worry about the consequences of loosing members of your engineering team.
* Become hyper agile and achieve high velocity while building satellite teams without facing any coherency problems among the services.

## Some of soajs features:
Build your product APIs with SOAJS and take advantage of tons of features that usually take months of work from your engineering team. Now you can be done within minutes.

1. Multi service with cloud self awareness
2. Multi project, environment, and configuration
3. Input Mapping, Formatting, and Validation (IMFV)
4. Security: oAuth, device and geo
5. Multitenancy & productization
6. User Registration & Access Control (URAC)
7. Admin & maintenance dashboard

### 1. Multi service with cloud self awareness
soajs gives you out of the box a service oriented architecture with self awareness among your services.

1. Improve performance
2. Allows distribution of services
3. Be scalable, reliable and modular from day one
4. Decreases infrastructure and development cost

### 2. Multi project, environment, and configuration
From day one

1. Take advantage of multi environment capability. For example build a development, staging, and production environments.
2. Enjoy the power and ease of configuring each environment from an infrastructure perspective including different devOps and techOps appetites.
3. Have the ability to create and deploy multiple projects on top of these environments without any collision.

### 3. Input Mapping, Formatting, and Validation (IMFV)
More than 50% of your API code is to collect, format, and validate the passed parameters from different sources (query, body, header, cookies, session, local config, and tenant or user specific service config ….)

IMFV does it all for you. A simple json configuration and you are done.

IMFV is based on json schema, support multiple sources with priority, and default values.

1. Multi type (string, integer, regex, etc..)
2. Multi format (email, phone, datetime, alphanumeric, etc..)
3. Complex schema (objects, arrays)
4. Custom format, type and schemas

### 4. Security: oAuth, device and geo
soajs offers two security mechanism to protect your APIs from outside and unwanted access:

API access protection via oAuth 2.0

1. Grant types: password, refresh_token
2. Custom grant type

API access is key driven where each key is secured by:

1. Expiration date
2. Device access restriction
3. Geo location access restriction

### 5. Multitenancy & productization
Package your services with different permissions and access controls and offer them as commercial products. Now that your services are productized, you can sell those products to different clients.

Create different tenants for your clients with applications that have different keys and expiry dates to use the productized services differently depending on the keys' configuration. Tenants use different products and products are used by different tenants.

This two way binding saves you lots of effort should you need to offer the same service to different clients that might also require you customize it for them.


### 6. User Registration & Access Control (URAC)
Soajs URAC is a service that manages all accounts for different tenants. This service is also equipped with an optional notification system in case registration accounts need to be verified, change email, and forgot password sections where invoked or if administrators add new Accounts.

Soajs URAC offers the ability to override the service access level as well as configuration for specific users regarding product packages and tenants applications.

#### Some of the URAC features
1. Guest features
    1. Join
    2. Login
    3. Forgot password / reset password
2. User features
    1. Logout
    4. My account
    5. Edit profile
    6. Change password
    7. Change email
3. Admin features
    1. List users
    2. Add New User
    3. Edit User
    4. Change User Status
4. Email Templates
    1. Join
    2. Forgot password
    3. Change Email
    4. Change User Status
    5. Add New User

### 7. Admin & maintenance dashboard
The Dashboard of SOAJS is built on AngularJs. The dashboard keeps you up to date with the multi environments services, tenants and Productization.

The Agent is a service that runs in the background and performs maintenance and update checks.

1. soajs agent
    1. send the soajs service topology (installed saojs service as well as packages versions to dashboard)
    2. trigger maintenance routes for all local soajs services
    3. send all local soajs services log to elastic search
    4. send soajs api call log to elastic search
    5. send OS, I/O, netwrok analytic information to dashboard
    6. Maintain self awareness among services and stay up to date

2. Service maintenance port
    1. Ability to reload environment registry configuration
    2. Ability to reload productization and multitenant configuration
    3. Heartbeat and functional check

---

More information is available on SOAJS [website](http://www.soajs.org).