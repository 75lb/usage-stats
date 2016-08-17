'use strict'
const path = require('path')
const os = require('os')
const fs = require('fs')

const gaUrl = {
  debug: 'https://www.google-analytics.com/debug/collect',
  collect: 'https://www.google-analytics.com/collect',
  batch: 'https://www.google-analytics.com/batch'
}

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
   * @param {string} - Google Analytics tracking ID (required).
   * @param [options] {object}
   * @param [options.name] {string} - App name
   * @param [options.version] {string} - App version
   * @param [options.lang] {string} - Language. Defaults to `process.env.LANG`.
   * @param [options.sr] {string} - Screen resolution. Defaults to `${process.stdout.rows}x${process.stdout.columns}`.
   * @param [options.dir] {string} - Path of the directory used for persisting clientID and queue.
   * @example
   * const usageStats = new UsageStats('UA-98765432-1', {
   *   name: 'sick app',
   *   version: '1.0.0'
   * })
   */
  constructor (trackingId, options) {
    if (!trackingId) throw new Error('a Google Analytics TrackingID is required')
    options = options || {}

    this.dir = options.dir || path.resolve(os.tmpdir(), 'usage-stats')

    this._queuePath = path.resolve(this.dir, 'queue')
    this._disabled = false
    this._hits = []
    let ua = 'Mozilla/5.0 '
    if (os.platform() === 'win32') {
      ua += `(Windows NT ${os.release()})`
    } else if (os.platform() === 'darwin') {
      ua += `(Macintosh; ${os.release()})`
    } else if (os.platform() === 'linux') {
      ua += `(X11; Linux ${os.release()})`
    }
    this._defaults = {
      v: 1,
      tid: trackingId,
      ds: 'app',
      cid: this._getClientId(),
      ua: ua,
      ul: options.lang || process.env.LANG,
      sr: options.sr || this._getScreenResolution(),
      an: options.name || '',
      av: options.version || '',
      aid: process.version,
      aiid: `${os.type()}; ${os.release()}`
    }
  }

  get dir () {
    return this._dir
  }
  set dir (val) {
    this._dir = val
    const mkdirp = require('mkdirp')
    mkdirp.sync(this._dir)
  }

  /**
   * Starts the [session](https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters#sc).
   * @chainable
   */
  start () {
    if (this._disabled) return this
    this._sessionStarted = true
    return this
  }

  /**
   * Ends the [session](https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters#sc).
   * @chainable
   */
  end () {
    if (this._disabled) return this
    this._hits[this._hits.length - 1] += '&sc=end'
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
   * @param {string} - Event category (required).
   * @param {string} - Event action (required).
   * @param [label] {string} - Event label
   * @param [value] {string} - Event value
   * @chainable
   */
  event (category, action, label, value) {
    if (this._disabled) return this
    if (!(category && action)) throw new Error('category and action required')
    const t = require('typical')
    const form = Object.assign({}, this._defaults, {
      t: 'event',
      ec: category,
      ea: action
    })
    if (this._sessionStarted) {
      form.sc = 'start'
      this._sessionStarted = false
    }
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
      cd: name
    })
    if (this._sessionStarted) {
      form.sc = 'start'
      this._sessionStarted = false
    }
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
   * @param [options] {object}
   * @param [options.debug] {boolean} - [Validates hits](https://developers.google.com/analytics/devguides/collection/protocol/v1/validating-hits), fulfilling with the result.
   * @returns {Promise}
   * @fulfil debug mode: `{ hits: {hits}, result: {validation result} }`
   * @fulfil live mode: `{ res: {res}, data: {Buffer} }`
   */
  send (options) {
    if (this._disabled) return this
    options = options || {}

    const toSend = this._dequeue().concat(this._hits)
    this._hits.length = 0

    const url = require('url')
    const requests = []
    if (options.debug) {
      const reqOptions = url.parse(gaUrl.debug)
      reqOptions.method = 'POST'
      return this._request(reqOptions, createHitsPayload(toSend))
        .then(response => {
          const output = {
            hits: toSend,
            result: JSON.parse(response.data.toString())
          }
          return JSON.stringify(output, null, '  ')
        })
        .catch(err => {
          if (err.code === 'ENOENT') {
            return {
              hits: toSend,
              result: '<offline>'
            }
          } else {
            throw err
          }
        })
    } else {
      const reqOptions = url.parse(gaUrl.batch)
      reqOptions.method = 'POST'
      while (toSend.length) {
        const batch = toSend.splice(0, 20)
        const req = this._request(reqOptions, createHitsPayload(batch))
          .then(response => {
            if (response.res.statusCode >= 300) {
              throw new Error('Unexpected response')
            } else {
              return response
            }
          })
          .catch(err => {
            this._enqueue(batch)
          })
        requests.push(req)
      }
      return Promise.all(requests)
    }
  }

  /**
   * Must return a v4 UUID.
   * @returns {string}
   * @private
   */
  _getClientId () {
    let cid = null
    const uuid = require('node-uuid')
    const cidPath = path.resolve(this.dir, 'cid')
    try {
      cid = fs.readFileSync(cidPath, 'utf8')
    } catch (err) {
      if (err.code !== 'ENOENT') throw err
      cid = uuid.v4()
      fs.writeFileSync(cidPath, cid)
    }
    return cid
  }

  /**
   * The request method used internally, can be overridden for testing or other purpose. Takes a node-style request options object in. Must return a promise.
   * @param {object}
   * @param [data] {*}
   * @returns {Promise}
   * @fulfil `{ res: <node response object>, data: <Buffer payload> }`
   * @private
   */
  _request (reqOptions, data) {
    const request = require('req-then')
    // console.error(reqOptions)
    // console.error(data)
    return request(reqOptions, data)
  }

  /**
   * Returns hits queued.
   * @param [count] {number} - Number of hits to dequeue. Defaults to "all hits".
   * @return {string[]}
   * @private
   */
  _dequeue (count) {
    try {
      const queue = fs.readFileSync(this._queuePath, 'utf8')
      const hits = queue ? queue.trim().split(os.EOL) : []
      let output = []
      if (count) {
        output = hits.splice(0, count)
        fs.writeFileSync(this._queuePath, createHitsPayload(hits))
      } else {
        fs.writeFileSync(this._queuePath, '')
        output = hits
      }
      return output
    } catch (err) {
      /* queue file doesn't exist */
      if (err.code === 'ENOENT') {
        return []
      } else {
        throw err
      }
    }
  }

  /**
   * @param {string[]}
   * @private
   */
  _enqueue (hits) {
    fs.appendFileSync(this._queuePath, createHitsPayload(hits))
  }

  _getScreenResolution () {
    return process.stdout.rows && process.stdout.columns
      ? `${process.stdout.rows}x${process.stdout.columns}`
      : 'N/A'
  }
}

function postData (form) {
  return Object.keys(form)
    .map(key => {
      return `${key}=${encodeURI(form[key])}`
    })
    .join('&')
}

function createHitsPayload (array) {
  let output = array.join(os.EOL)
  if (output) output += os.EOL
  return output
}

module.exports = UsageStats
