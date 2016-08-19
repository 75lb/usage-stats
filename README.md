[![view on npm](http://img.shields.io/npm/v/usage-stats.svg)](https://www.npmjs.org/package/usage-stats)
[![npm module downloads](http://img.shields.io/npm/dt/usage-stats.svg)](https://www.npmjs.org/package/usage-stats)
[![Build Status](https://travis-ci.org/75lb/usage-stats.svg?branch=master)](https://travis-ci.org/75lb/usage-stats)
[![Coverage Status](https://coveralls.io/repos/github/75lb/usage-stats/badge.svg?branch=master)](https://coveralls.io/github/75lb/usage-stats?branch=master)
[![Dependency Status](https://david-dm.org/75lb/usage-stats.svg)](https://david-dm.org/75lb/usage-stats)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](https://github.com/feross/standard)

# usage-stats

A minimal, offline-friendly [Google Analytics Measurement Protocol](https://developers.google.com/analytics/devguides/collection/protocol/v1/) client for tracking usage statistics in node.js applications.

## Synopsis

```js
const UsageStats = require('usage-stats')
const usageStats = new UsageStats('UA-98765432-1', {
  name: 'sick app',
  version: '1.0.0'
})

// start a new session
usageStats.start()

// user sets an option..
usageStats.event('option', 'verbose-level', 'infinite')

try {
  // register a hit on 'encoding mode'
  usageStats.screenView('encoding')
  beginEncoding(options)
} catch (err) {
  // exception tracking
  usageStats.exception(err.message, true)
}

// finished - mark the session as complete
// and send stats (or store until later, if offline).
usageStats.end().send()
```

## List of metrics sent

Beside tracking events, exceptions and screenviews, the follow stats are collected each session.

* [App name](https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters#an)
* [App version](https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters#av)
* Node.js version (sent as [App ID](https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters#aid))
* Operating System version (sent in [App Installer ID](https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters#aiid) and [User Agent](https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters#ua))
* [Client ID](https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters#cid) (a random UUID, generated once per OS user and stored)
* [Language](https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters#ul) (`process.env.LANG`, if set)
* [Screen resolution](https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters#sr) (terminal rows by columns, by default)

## API Reference

**Example**  
```js
const UsageStats = require('usage-stats')
```

* [usage-stats](#module_usage-stats)
    * [UsageStats](#exp_module_usage-stats--UsageStats) ⏏
        * [new UsageStats(trackingId, [options])](#new_module_usage-stats--UsageStats_new)
        * [.start()](#module_usage-stats--UsageStats+start) ↩︎
        * [.end()](#module_usage-stats--UsageStats+end) ↩︎
        * [.disable()](#module_usage-stats--UsageStats+disable) ↩︎
        * [.enable()](#module_usage-stats--UsageStats+enable) ↩︎
        * [.event(category, action, [label], [value])](#module_usage-stats--UsageStats+event) ↩︎
        * [.screenView(name)](#module_usage-stats--UsageStats+screenView) ↩︎
        * [.exception(description, isFatal)](#module_usage-stats--UsageStats+exception) ↩︎
        * [.send([options])](#module_usage-stats--UsageStats+send) ⇒ <code>Promise</code>

<a name="exp_module_usage-stats--UsageStats"></a>

### UsageStats ⏏
**Kind**: Exported class  
<a name="new_module_usage-stats--UsageStats_new"></a>

#### new UsageStats(trackingId, [options])

| Param | Type | Description |
| --- | --- | --- |
| trackingId | <code>string</code> | Google Analytics tracking ID (required). |
| [options] | <code>object</code> |  |
| [options.name] | <code>string</code> | App name |
| [options.version] | <code>string</code> | App version |
| [options.lang] | <code>string</code> | Language. Defaults to `process.env.LANG`. |
| [options.sr] | <code>string</code> | Screen resolution. Defaults to `${process.stdout.rows}x${process.stdout.columns}`. |
| [options.dir] | <code>string</code> | Path of the directory used for persisting clientID and queue. |

**Example**  
```js
const usageStats = new UsageStats('UA-98765432-1', {
  name: 'sick app',
  version: '1.0.0'
})
```
<a name="module_usage-stats--UsageStats+start"></a>

#### usageStats.start() ↩︎
Starts the [session](https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters#sc).

**Kind**: instance method of <code>[UsageStats](#exp_module_usage-stats--UsageStats)</code>  
**Chainable**  
<a name="module_usage-stats--UsageStats+end"></a>

#### usageStats.end() ↩︎
Ends the [session](https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters#sc).

**Kind**: instance method of <code>[UsageStats](#exp_module_usage-stats--UsageStats)</code>  
**Chainable**  
<a name="module_usage-stats--UsageStats+disable"></a>

#### usageStats.disable() ↩︎
Disable the module. While disabled, all operations are no-ops.

**Kind**: instance method of <code>[UsageStats](#exp_module_usage-stats--UsageStats)</code>  
**Chainable**  
<a name="module_usage-stats--UsageStats+enable"></a>

#### usageStats.enable() ↩︎
Re-enable the module.

**Kind**: instance method of <code>[UsageStats](#exp_module_usage-stats--UsageStats)</code>  
**Chainable**  
<a name="module_usage-stats--UsageStats+event"></a>

#### usageStats.event(category, action, [label], [value]) ↩︎
Track an event. All event hits are queued until `.send()` is called.

**Kind**: instance method of <code>[UsageStats](#exp_module_usage-stats--UsageStats)</code>  
**Chainable**  

| Param | Type | Description |
| --- | --- | --- |
| category | <code>string</code> | Event category (required). |
| action | <code>string</code> | Event action (required). |
| [label] | <code>string</code> | Event label |
| [value] | <code>string</code> | Event value |

<a name="module_usage-stats--UsageStats+screenView"></a>

#### usageStats.screenView(name) ↩︎
Track a screenview. All screenview hits are queued until `.send()` is called.

**Kind**: instance method of <code>[UsageStats](#exp_module_usage-stats--UsageStats)</code>  
**Chainable**  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | Screen name |

<a name="module_usage-stats--UsageStats+exception"></a>

#### usageStats.exception(description, isFatal) ↩︎
Track a exception. All screenview hits are queued until `.send()` is called.

**Kind**: instance method of <code>[UsageStats](#exp_module_usage-stats--UsageStats)</code>  
**Chainable**  

| Param | Type | Description |
| --- | --- | --- |
| description | <code>string</code> | Error message |
| isFatal | <code>boolean</code> | Set true if the exception was fatal |

<a name="module_usage-stats--UsageStats+send"></a>

#### usageStats.send([options]) ⇒ <code>Promise</code>
Send queued stats using as few requests as possible (typically a single request - a max of 20 events/screenviews may be sent per request). If offline, the stats will be stored and re-tried on next invocation.

**Kind**: instance method of <code>[UsageStats](#exp_module_usage-stats--UsageStats)</code>  
**Fulfil**: debug mode: `{ hits: {hits}, result: {validation result} }`  
**Fulfil**: live mode: `{ res: {res}, data: {Buffer} }`  

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>object</code> |  |
| [options.debug] | <code>boolean</code> | [Validates hits](https://developers.google.com/analytics/devguides/collection/protocol/v1/validating-hits), fulfilling with the result. |


* * *

&copy; 2016 Lloyd Brookes \<75pound@gmail.com\>. Documented by [jsdoc-to-markdown](https://github.com/jsdoc2md/jsdoc-to-markdown).
