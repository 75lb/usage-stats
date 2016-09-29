[![view on npm](http://img.shields.io/npm/v/usage-stats.svg)](https://www.npmjs.org/package/usage-stats)
[![npm module downloads](http://img.shields.io/npm/dt/usage-stats.svg)](https://www.npmjs.org/package/usage-stats)
[![Build Status](https://travis-ci.org/75lb/usage-stats.svg?branch=master)](https://travis-ci.org/75lb/usage-stats)
[![Coverage Status](https://coveralls.io/repos/github/75lb/usage-stats/badge.svg?branch=master)](https://coveralls.io/github/75lb/usage-stats?branch=master)
[![Dependency Status](https://david-dm.org/75lb/usage-stats.svg)](https://david-dm.org/75lb/usage-stats)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](https://github.com/feross/standard)

# usage-stats

A minimal, offline-friendly [Google Analytics Measurement Protocol](https://developers.google.com/analytics/devguides/collection/protocol/v1/) client for tracking usage statistics in node.js applications.

This is only a low-level client API, it doesn't hold any opinion of how usage tracking should be done. If you're looking for a convention which leverages the power and flexibility of [Custom Metrics and Dimensions](https://support.google.com/analytics/answer/2709828?hl=en&ref_topic=2709827), take a look at track-usage.

## Synopsis

### Simple

The most trivial example.

```js
const UsageStats = require('usage-stats')
const usageStats = new UsageStats('UA-98765432-1')

// track a hit on the 'main' screen with 'simple' mode set.
usageStats
  .screenView('main')
  .event('option', 'mode', 'simple')
  .send()
```

### Typical

More realistic usage in an example video encoding app.

```js
const UsageStats = require('usage-stats')
const usageStats = new UsageStats('UA-98765432-1', {
  name: 'enocode-video',
  version: '1.0.0'
})

// start a new session
usageStats.start()

// user set two options..
usageStats.event('option', 'verbose-level', 'infinite')
usageStats.event('option', 'preset', 'iPod')

try {
  // Begin. Track as a screenView.
  usageStats.screenView('encoding')
  beginEncoding(options)
} catch (err) {
  // Exception tracking
  usageStats.exception(err.message, true)
}

// finished - mark the session as complete
// and send stats (or store if offline).
usageStats.end().send()
```

## Parameters

See [here](https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters) for the full list of Google Analytics Measurement Protocol parameters.

### Sent by default

All parameters are send on demand, beside this list.

* Operating System version (sent in the UserAgent)
* [Client ID](https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters#cid) (a random UUID, generated once per OS user and stored)
* [Language](https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters#ul) (`process.env.LANG`, if set)
* [Screen resolution](https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters#sr) (terminal rows by columns, by default)

## API Reference

**Kind**: inner class of <code>[UsageStats](#exp_module_usage-stats--UsageStats)</code>  
**Extends:** <code>[usage-stats](#module_usage-stats)</code>  

* [~UsageStatsAbortable](#module_usage-stats--UsageStats..UsageStatsAbortable) ⇐ <code>[usage-stats](#module_usage-stats)</code>
    * [.send([options])](#module_usage-stats--UsageStats..UsageStatsAbortable+send)
    * [.abort()](#module_usage-stats--UsageStats..UsageStatsAbortable+abort) ↩︎
    * [.start([sessionParams])](#) ↩︎
    * [.end([sessionParams])](#) ↩︎
    * [.disable()](#) ↩︎
    * [.enable()](#) ↩︎
    * [.event(category, action, [options])](#) ⇒ <code>Map</code>
    * [.screenView(name, [options])](#) ⇒ <code>Map</code>
    * [.exception(description, isFatal)](#) ⇒ <code>Map</code>
    * [.debug()](#) ⇒ <code>Promise</code>

<a name="module_usage-stats--UsageStats..UsageStatsAbortable+send"></a>

### usage.send([options])
**Kind**: instance method of <code>[UsageStatsAbortable](#module_usage-stats--UsageStats..UsageStatsAbortable)</code>  
**Overrides:** <code>[send](#module_usage-stats--UsageStats+send)</code>  

| Param | Type |
| --- | --- |
| [options] | <code>object</code> | 
| [options.timeout] | <code>number</code> | 

<a name="module_usage-stats--UsageStats..UsageStatsAbortable+abort"></a>

### usage.abort() ↩︎
Aborts the in-progress .send() operation, queuing any unsent hits.

**Kind**: instance method of <code>[UsageStatsAbortable](#module_usage-stats--UsageStats..UsageStatsAbortable)</code>  
**Chainable**  
<a name=""></a>

### usage.start([sessionParams]) ↩︎
Starts the [session](https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters#sc).

**Kind**: instance method of <code>[UsageStatsAbortable](#module_usage-stats--UsageStats..UsageStatsAbortable)</code>  
**Chainable**  

| Param | Type | Description |
| --- | --- | --- |
| [sessionParams] | <code>Array.&lt;Map&gt;</code> | An optional map of paramaters to send with each hit in the sesison. |

<a name=""></a>

### usage.end([sessionParams]) ↩︎
Ends the [session](https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters#sc).

**Kind**: instance method of <code>[UsageStatsAbortable](#module_usage-stats--UsageStats..UsageStatsAbortable)</code>  
**Chainable**  

| Param | Type | Description |
| --- | --- | --- |
| [sessionParams] | <code>Array.&lt;Map&gt;</code> | An optional map of paramaters to send with the final hit of this sesison. |

<a name=""></a>

### usage.disable() ↩︎
Disable the module. While disabled, all operations are no-ops.

**Kind**: instance method of <code>[UsageStatsAbortable](#module_usage-stats--UsageStats..UsageStatsAbortable)</code>  
**Chainable**  
<a name=""></a>

### usage.enable() ↩︎
Re-enable the module.

**Kind**: instance method of <code>[UsageStatsAbortable](#module_usage-stats--UsageStats..UsageStatsAbortable)</code>  
**Chainable**  
<a name=""></a>

### usage.event(category, action, [options]) ⇒ <code>Map</code>
Track an event. All event hits are queued until `.send()` is called.

**Kind**: instance method of <code>[UsageStatsAbortable](#module_usage-stats--UsageStats..UsageStatsAbortable)</code>  

| Param | Type | Description |
| --- | --- | --- |
| category | <code>string</code> | Event category (required). |
| action | <code>string</code> | Event action (required). |
| [options] | <code>option</code> |  |
| [options.label] | <code>string</code> | Event label |
| [options.value] | <code>string</code> | Event value |
| [options.hitParams] | <code>Array.&lt;map&gt;</code> | One or more additional params to send with the hit. |

<a name=""></a>

### usage.screenView(name, [options]) ⇒ <code>Map</code>
Track a screenview. All screenview hits are queued until `.send()` is called. Returns the hit instance.

**Kind**: instance method of <code>[UsageStatsAbortable](#module_usage-stats--UsageStats..UsageStatsAbortable)</code>  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | Screen name |
| [options] | <code>object</code> |  |
| [options.hitParams] | <code>Array.&lt;map&gt;</code> | One or more additional params to set on the hit. |

<a name=""></a>

### usage.exception(description, isFatal) ⇒ <code>Map</code>
Track a exception. All exception hits are queued until `.send()` is called.

**Kind**: instance method of <code>[UsageStatsAbortable](#module_usage-stats--UsageStats..UsageStatsAbortable)</code>  

| Param | Type | Description |
| --- | --- | --- |
| description | <code>string</code> | Error message |
| isFatal | <code>boolean</code> | Set true if the exception was fatal |
| [options.hitParams] | <code>Array.&lt;map&gt;</code> | One or more additional params to set on the hit. |

<a name=""></a>

### usage.debug() ⇒ <code>Promise</code>
Send any hits (including queued) to the GA [validation server](https://developers.google.com/analytics/devguides/collection/protocol/v1/validating-hits), fulfilling with the result.

**Kind**: instance method of <code>[UsageStatsAbortable](#module_usage-stats--UsageStats..UsageStatsAbortable)</code>  
**Fulfil**: <code>Response[]</code>  
**Reject**: <code>Error</code> - Error instance includes `hits`.  

* * *

&copy; 2016 Lloyd Brookes \<75pound@gmail.com\>. Documented by [jsdoc-to-markdown](https://github.com/jsdoc2md/jsdoc-to-markdown).
