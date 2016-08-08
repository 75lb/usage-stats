[![view on npm](http://img.shields.io/npm/v/usage-stats.svg)](https://www.npmjs.org/package/usage-stats)
[![npm module downloads](http://img.shields.io/npm/dt/usage-stats.svg)](https://www.npmjs.org/package/usage-stats)
[![Build Status](https://travis-ci.org/75lb/usage-stats.svg?branch=master)](https://travis-ci.org/75lb/usage-stats)
[![Dependency Status](https://david-dm.org/75lb/usage-stats.svg)](https://david-dm.org/75lb/usage-stats)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](https://github.com/feross/standard)

# usage-stats

A minimal, offline-friendly [Google Analytics Measurement Protocol](https://developers.google.com/analytics/devguides/collection/protocol/v1/) client for tracking usage statistics in node.js apps.

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

// finished - mark the session as complete
// and send stats (or store if offline).
usageStats.end().send()
```

## List of stats sent

Beside tracking events and screenviews, the follow stats are collected each session.

* App name
* App version
* User ID (a random UUID, generated once per OS user and stored)
* Language
* OS version
* Terminal resolution (rows by columns)

## API Reference

**Example**  
```js
const UsageStats = require('usage-stats')
```

* [usage-stats](#module_usage-stats)
    * [UsageStats](#exp_module_usage-stats--UsageStats) ⏏
        * [new UsageStats([options])](#new_module_usage-stats--UsageStats_new)
        * [.start()](#module_usage-stats--UsageStats+start) ↩︎
        * [.end()](#module_usage-stats--UsageStats+end) ↩︎
        * [.disable()](#module_usage-stats--UsageStats+disable) ↩︎
        * [.enable()](#module_usage-stats--UsageStats+enable) ↩︎
        * [.event(category, action, [label], [value])](#module_usage-stats--UsageStats+event) ↩︎
        * [.screenView(name)](#module_usage-stats--UsageStats+screenView) ↩︎
        * [.send()](#module_usage-stats--UsageStats+send) ↩︎

<a name="exp_module_usage-stats--UsageStats"></a>

### UsageStats ⏏
**Kind**: Exported class  
<a name="new_module_usage-stats--UsageStats_new"></a>

#### new UsageStats([options])

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>object</code> |  |
| [options.appName] | <code>string</code> | App name |
| [options.version] | <code>string</code> | App version |
| [options.tid] | <code>string</code> | Google Analytics tracking ID |

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
| category | <code>string</code> | Event category |
| action | <code>string</code> | Event action |
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

<a name="module_usage-stats--UsageStats+send"></a>

#### usageStats.send() ↩︎
Send queued stats using as few requests as possible (typically a single request - a max of 20 events/screenviews may be sent per request). If offline, the stats will be stored and re-tried on next invocation.

**Kind**: instance method of <code>[UsageStats](#exp_module_usage-stats--UsageStats)</code>  
**Chainable**  

* * *

&copy; 2016 Lloyd Brookes \<75pound@gmail.com\>. Documented by [jsdoc-to-markdown](https://github.com/jsdoc2md/jsdoc-to-markdown).
