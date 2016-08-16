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
const usageStats = new UsageStats({
  appName: 'sick app',
  version: '1.0.0',
  tid: 'UA-98765432-1'
})

// start a new session
usageStats.start()

// user set an option..
usageStats.event('option', 'verbose-level', 'infinite')

// app is running in 'encoding' mode..
usageStats.screenView('encoding')

try {
  beginEncoding(options)
} catch (err) {
  // exception tracking
  usageStats.exception(err.message, true)
}

// finished - mark the session as complete
// and send stats (or store until later, if offline).
usageStats.end().send()
```

## List of stats sent

Beside tracking events, exceptions and screenviews, the follow stats are collected each session.

* App name
* App version
* Node.js version (sent as App ID)
* User ID (a random UUID, generated once per OS user and stored)
* Language (`process.env.LANG`, if set)
* OS version (sent as App Installer ID)
* Terminal resolution (rows by columns)

## API Reference

**Example**  
```js
const UsageStats = require('usage-stats')
```

* [usage-stats](#module_usage-stats)
    * [UsageStats](#exp_module_usage-stats--UsageStats) ⏏
        * [new UsageStats(trackingId, [options])](#new_module_usage-stats--UsageStats_new)
        * [._dir](#module_usage-stats--UsageStats.UsageStats+_dir) : <code>string</code>
        * [._queuePath](#module_usage-stats--UsageStats.UsageStats+_queuePath) : <code>string</code>
        * [.start()](#module_usage-stats--UsageStats+start) ↩︎
        * [.end()](#module_usage-stats--UsageStats+end) ↩︎
        * [.disable()](#module_usage-stats--UsageStats+disable) ↩︎
        * [.enable()](#module_usage-stats--UsageStats+enable) ↩︎
        * [.event(category, action, [label], [value])](#module_usage-stats--UsageStats+event) ↩︎
        * [.screenView(name)](#module_usage-stats--UsageStats+screenView) ↩︎
        * [.exception(description, isFatal)](#module_usage-stats--UsageStats+exception) ↩︎
        * [.send([options])](#module_usage-stats--UsageStats+send) ⇒ <code>Promise</code>
        * [._getClientId()](#module_usage-stats--UsageStats+_getClientId) ⇒ <code>string</code>
        * [._request()](#module_usage-stats--UsageStats+_request) ⇒ <code>Promise</code>
        * [._dequeue([count])](#module_usage-stats--UsageStats+_dequeue) ⇒ <code>Array.&lt;string&gt;</code>
        * [._enqueue(hits)](#module_usage-stats--UsageStats+_enqueue)

<a name="exp_module_usage-stats--UsageStats"></a>

### UsageStats ⏏
**Kind**: Exported class  
<a name="new_module_usage-stats--UsageStats_new"></a>

#### new UsageStats(trackingId, [options])

| Param | Type | Description |
| --- | --- | --- |
| trackingId | <code>string</code> | Google Analytics tracking ID (required). |
| [options] | <code>object</code> |  |
| [options.appName] | <code>string</code> | App name |
| [options.version] | <code>string</code> | App version |
| [options.lang] | <code>string</code> | Language. Defaults to `process.env.LANG`. |
| [options.sr] | <code>string</code> | Screen resolution. Defaults to `${process.stdout.rows}x${process.stdout.columns}`. |

**Example**  
```js
const usageStats = new UsageStats('UA-98765432-1', {
  appName: 'sick app',
  version: '1.0.0'
})
```
<a name="module_usage-stats--UsageStats.UsageStats+_dir"></a>

#### usageStats._dir : <code>string</code>
Absolute path of the temporary directory used for persisting clientID and queue.

**Kind**: instance property of <code>[UsageStats](#exp_module_usage-stats--UsageStats)</code>  
<a name="module_usage-stats--UsageStats.UsageStats+_queuePath"></a>

#### usageStats._queuePath : <code>string</code>
The absolute path of the queue.

**Kind**: instance property of <code>[UsageStats](#exp_module_usage-stats--UsageStats)</code>  
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

<a name="module_usage-stats--UsageStats+_getClientId"></a>

#### usageStats._getClientId() ⇒ <code>string</code>
Must return a v4 UUID.

**Kind**: instance method of <code>[UsageStats](#exp_module_usage-stats--UsageStats)</code>  
<a name="module_usage-stats--UsageStats+_request"></a>

#### usageStats._request() ⇒ <code>Promise</code>
The request method used internally, can be overridden for testing or other purpose. Takes a node-style request options object in. Must return a promise.

**Kind**: instance method of <code>[UsageStats](#exp_module_usage-stats--UsageStats)</code>  
**Fulfil**: `{ res: <node response object>, data: <Buffer payload> }`  
<a name="module_usage-stats--UsageStats+_dequeue"></a>

#### usageStats._dequeue([count]) ⇒ <code>Array.&lt;string&gt;</code>
Returns hits queued.

**Kind**: instance method of <code>[UsageStats](#exp_module_usage-stats--UsageStats)</code>  

| Param | Type | Description |
| --- | --- | --- |
| [count] | <code>number</code> | Number of hits to dequeue. Defaults to "all hits". |

<a name="module_usage-stats--UsageStats+_enqueue"></a>

#### usageStats._enqueue(hits)
**Kind**: instance method of <code>[UsageStats](#exp_module_usage-stats--UsageStats)</code>  

| Param | Type |
| --- | --- |
| hits | <code>Array.&lt;string&gt;</code> | 


* * *

&copy; 2016 Lloyd Brookes \<75pound@gmail.com\>. Documented by [jsdoc-to-markdown](https://github.com/jsdoc2md/jsdoc-to-markdown).
