'use strict'
const request = require('req-then')
const url = require('url')
const path = require('path')
const os = require('os')
const fs = require('fs')
const reqOptions = url.parse('http://www.google-analytics.com/batch')
reqOptions.method = 'POST'

/**
 * @module usage-stats
 * @typicalname usageStats
 * @example
 * const UsageStats = require('usage-stats')
 */

 /**
  * @alias module:usage-stats
  */
class UsageStats {
  /**
   * @param [options] {object}
   * @param [options.appName] {string} - App name
   * @param [options.version] {string} - App version
   * @param [options.tid] {string} - Google Analytics tracking ID
   * @example
   * const usageStats = new UsageStats({
   *   appName: 'sick app',
   *   version: '1.0.0',
   *   tid: 'UA-98765432-1'
   * })
   */
  constructor (options) {
    options = options || {}
    this._dir = path.resolve(os.tmpdir(), 'usage-stats')
    this._queuePath = path.resolve(this._dir, 'queue')
    this._appName = options.appName
    this._version = options.version
    this._disabled = false
    this._readClientId()
    this._defaults = {
      v: 1,
      tid: options.tid,
      cid: this._cid,
      ds: 'app',
      ul: process.env.LANG,
      ua: `jsdoc2md/${options.version} (${os.type()}; ${os.release()})`,
      sr: `${process.stdout.rows}x${process.stdout.columns}`
    }
    this._hits = []
  }
  /**
   * Starts the [session](https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters#sc).
   * @chainable
   */
  start () {
    if (this._disabled) return this
    this._hits.push(postData({ sc: 'start' }))
    return this
  }

  /**
   * Ends the [session](https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters#sc).
   * @chainable
   */
  end () {
    if (this._disabled) return this
    this._hits.push(postData({ sc: 'end' }))
    return this
  }

  /**
   * Disable the module. While disabled, all operations are no-ops.
   * @chainable
   */
  disable () {
    this._disabled = true
    return this
  }

  /**
   * Re-enable the module.
   * @chainable
   */
  enable () {
    this._disabled = false
    return this
  }

  /**
   * Track an event. All event hits are queued until `.send()` is called.
   * @param {string} - Event category
   * @param {string} - Event action
   * @param [label] {string} - Event label
   * @param [value] {string} - Event value
   * @chainable
   */
  event (category, action, label, value) {
    if (this._disabled) return this
    const t = require('typical')
    const form = Object.assign({}, this._defaults, {
      t: 'event',
      ec: category,
      ea: action
    })
    if (t.isDefined(label)) form.el = label
    if (t.isDefined(value)) form.ev = value
    this._hits.push(postData(form))
    return this
  }

  /**
   * Track a screenview. All screenview hits are queued until `.send()` is called.
   * @param {string} - Screen name
   * @chainable
   */
  screenView (name) {
    if (this._disabled) return this
    const form = Object.assign({}, this._defaults, {
      t: 'screenview',
      an: this._appName,
      av: this._version,
      aid: process.version,
      cd: name
    })
    this._hits.push(postData(form))
    return this
  }

  /**
   * Track a exception. All screenview hits are queued until `.send()` is called.
   * @param {string} - Error message
   * @param {boolean} - Set true if the exception was fatal
   * @chainable
   */
  exception (description, isFatal) {
    if (this._disabled) return this
    const form = Object.assign({}, this._defaults, {
      t: 'exception',
      exd: description,
      exf: isFatal ? 1 : 0
    })
    this._hits.push(postData(form))
    return this
  }

  /**
   * Send queued stats using as few requests as possible (typically a single request - a max of 20 events/screenviews may be sent per request). If offline, the stats will be stored and re-tried on next invocation.
   * @chainable
   */
  send () {
    if (this._disabled) return this
    let queued = ''
    try {
      queued = fs.readFileSync(this._queuePath, 'utf8')
      fs.unlinkSync(this._queuePath)
    } catch (err) {
      if (err.code !== 'ENOENT') throw err
    }
    const lines = queued ? queued.trim().split('\n').concat(this._hits) : this._hits.slice(0)
    this._hits.length = 0
    while (lines.length) {
      const batch = lines.splice(0, 5).join('\n') + '\n'
      request(reqOptions, batch)
        .catch(err => {
          try {
            fs.appendFileSync(this._queuePath, batch)
          } catch (err) {
            if (err.code !== 'ENOENT') throw err
            try {
              fs.mkdirSync(this._dir)
            } catch (err) {
              // exists
            }
            fs.appendFileSync(this._queuePath, batch)
          }
        })
    }
    return this
  }

  _readClientId () {
    if (!this._cid) {
      const uuid = require('node-uuid')
      const cidPath = path.resolve(this._dir, 'cid')
      try {
        this._cid = fs.readFileSync(cidPath, 'utf8')
      } catch (err) {
        if (err.code !== 'ENOENT') throw err
        this._cid = uuid.v4()
        try {
          fs.mkdirSync(this._dir)
        } catch (err) {
          // exists
        }
        fs.writeFileSync(cidPath, this._cid)
      }
    }
  }
}

function postData (form) {
  return Object.keys(form)
    .map(key => {
      return `${key}=${encodeURI(form[key])}`
    })
    .join('&')
}

module.exports = UsageStats
