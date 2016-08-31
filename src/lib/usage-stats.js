'use strict'
const path = require('path')
const os = require('os')
const fs = require('fs')
const arrayify = require('array-back')

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
   * @param [options.ua] {string} - User Agent string to use.
   * @param [options.dir] {string} - Path of the directory used for persisting clientID and queue.
   * @param [options.url] {string} - Defaults to `'https://www.google-analytics.com/batch'`.
   * @param [options.debugUrl] {string} - Defaults to `'https://www.google-analytics.com/debug/collect'`.
   * @example
   * const usageStats = new UsageStats('UA-98765432-1', {
   *   name: 'sick app',
   *   version: '1.0.0'
   * })
   */
  constructor (trackingId, options) {
    if (!trackingId) throw new Error('a Google Analytics TrackingID is required')
    options = options || {}

    const homePath = require('home-path')

    /**
     * Cache directory where the queue and client ID is kept. Defaults to `~/.usage-stats`.
     * @type {string}
     */
    this.dir = options.dir || path.resolve(homePath(), '.usage-stats')

    this._queuePath = path.resolve(this.dir, 'queue')
    this._disabled = false
    this._hits = []

    this._url = {
      debug: options.debugUrl || 'https://www.google-analytics.com/debug/collect',
      batch: options.url || 'https://www.google-analytics.com/batch'
    }

    /**
     * Set parameters on this map to send them with every hit.
     * @type {Map}
     */
    this.defaults = new Map([
      [ 'v', 1 ],
      [ 'tid', trackingId ],
      [ 'ds', 'app' ],
      [ 'cid', this._getClientId() ],
      [ 'ua', options.ua || `Mozilla/5.0 ${this._getOSVersion()}` ],
      [ 'ul', options.lang || process.env.LANG ],
      [ 'sr', options.sr || this._getScreenResolution() ],
      [ 'an', options.name || '' ],
      [ 'av', options.version || '' ]
    ])

    this._requestController = {}
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
   * @param [sessionParams] {Map[]} - An option map of paramaters to send with each hit in the sesison.
   * @chainable
   */
  start (sessionParams) {
    if (this._disabled) return this
    this._sessionStarted = true
    if (sessionParams) this._sessionParams = sessionParams
    return this
  }

  /**
   * Ends the [session](https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters#sc).
   * @chainable
   */
  end () {
    if (this._disabled) return this
    if (this._hits.length === 1) {
      this._hits[0].set('sc', 'end')
    } else if (this._hits.length > 1) {
      this._hits[this._hits.length - 1].set('sc', 'end')
    }
    if (this._sessionParams) delete this._sessionParams
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

  _createHit (map) {
    if (map && !(map instanceof Map)) throw new Error('map instance required')
    return new Map([ ...this.defaults, ...map ])
  }

  /**
   * Track an event. All event hits are queued until `.send()` is called.
   * @param {string} - Event category (required).
   * @param {string} - Event action (required).
   * @param [options] {option}
   * @param [options.label] {string} - Event label
   * @param [options.value] {string} - Event value
   * @param [options.hitParams] {map[]} - One or more additional params to send with the hit.
   * @chainable
   */
  event (category, action, options) {
    if (this._disabled) return this
    options = options || {}
    if (!(category && action)) throw new Error('category and action required')

    let hit = this._createHit(new Map([
      [ 't', 'event' ],
      [ 'ec', category ],
      [ 'ea', action ]
    ]))
    if (options.hitParams) hit = new Map([ ...hit, ...options.hitParams ])
    if (this._sessionParams) hit = new Map([ ...hit, ...this._sessionParams ])
    if (this._sessionStarted) {
      hit.set('sc', 'start')
      this._sessionStarted = false
    }

    const t = require('typical')
    if (t.isDefined(options.label)) hit.set('el', options.label)
    if (t.isDefined(options.value)) hit.set('ev', options.value)
    this._hits.push(hit)
    return this
  }

  /**
   * Track a screenview. All screenview hits are queued until `.send()` is called.
   * @param {string} - Screen name
   * @param [options] {object}
   * @param [options.hitParams] {map[]} - One or more additional params to set on the hit.
   * @chainable
   */
  screenView (name, options) {
    if (this._disabled) return this
    options = options || {}
    if (options.hitParams && !(options.hitParams instanceof Map)) throw new Error('map instance required')

    let hit = this._createHit(new Map([
      [ 't', 'screenview' ],
      [ 'cd', name ],
    ]))
    if (options.hitParams) hit = new Map([ ...hit, ...options.hitParams ])
    if (this._sessionParams) hit = new Map([ ...hit, ...this._sessionParams ])
    if (this._sessionStarted) {
      hit.set('sc', 'start')
      this._sessionStarted = false
    }
    this._hits.push(hit)
    return this
  }

  /**
   * Track a exception. All exception hits are queued until `.send()` is called.
   * @param {string} - Error message
   * @param {boolean} - Set true if the exception was fatal
   * @param [options.hitParams] {map[]} - One or more additional params to set on the hit.
   * @chainable
   */
  exception (description, isFatal, options) {
    if (this._disabled) return this
    options = options || {}
    let hit = this._createHit(new Map([
      [ 't', 'exception' ],
      [ 'exd', description ],
      [ 'exf', isFatal ? 1 : 0 ]
    ]))
    if (options.hitParams) hit = new Map([ ...hit, ...options.hitParams ])
    if (this._sessionParams) hit = new Map([ ...hit, ...this._sessionParams ])
    if (this._sessionStarted) {
      hit.set('sc', 'start')
      this._sessionStarted = false
    }
    this._hits.push(hit)
    return this
  }

  /**
   * Send queued stats using as few requests as possible (typically a single request - a max of 20 events/screenviews may be sent per request). If offline, the stats will be stored and re-tried on next invocation.
   * @param [options] {object}
   * @param [options.debug] {boolean} - [Validates hits](https://developers.google.com/analytics/devguides/collection/protocol/v1/validating-hits), fulfilling with the result.
   * @returns {Promise}
   * @fulfil `response[]` - array of responses
   */
  send (options) {
    if (this._disabled) return Promise.resolve([])
    options = options || {}

    let toSend = this._dequeue().concat(this._hits)
    this._hits.length = 0

    const url = require('url')
    const reqOptions = url.parse(options.debug ? this._url.debug : this._url.batch)
    reqOptions.method = 'POST'
    reqOptions.headers = {
      'content-type': 'text/plain'
    }
    reqOptions.controller = this._requestController

    const requests = []
    if (options.debug) {
      while (toSend.length && !this._aborted) {
        let batch = toSend.splice(0, 20)
        const req = this._request(reqOptions, this._createHitsPayload(batch))
          .then(validGAResponse)
          .then(response => {
            return {
              hits: batch,
              result: JSON.parse(response.data.toString())
            }
          })
          .catch(err => {
            return {
              hits: batch,
              err: err
            }
          })
        requests.push(req)
      }
      return Promise.all(requests)
    } else {
      while (toSend.length && !this._aborted) {
        let batch = toSend.splice(0, 20)
        const req = this._request(reqOptions, this._createHitsPayload(batch))
          .then(validGAResponse)
          .catch(err => {
            /* network fail, aborted or unexpected response */
            batch = batch.map(hit => {
              /* aborted flag */
              if (err.name === 'aborted') hit.set('cd4', true)
              /* queued flag */
              hit.set('cd5', true)
              return hit
            })
            this._enqueue(batch)
            return {
              err: err
            }
          })
        requests.push(req)
      }
      return Promise.all(requests)
        .then(results => {
          if (this._aborted) {
            toSend = toSend.map(hit => {
              /* queued flag */
              hit.set('cd5', true)
              return hit
            })
            this._enqueue(toSend)
            this._aborted = false
          }
          return results
        })
    }
  }

  /**
   * Aborts the in-progress .send() operation, queuing any unsent hits.
   * @chainable
   */
  abort () {
    if (this._disabled) return this
    if (this._requestController && this._requestController.abort) {
      this._aborted = true
      this._requestController.abort()
    }
    return this
  }

  /**
   * Dumps unsent hits to the queue. They will dequeued and sent on next invocation of `.send()`.
   * @chainable
   */
  save () {
    this._enqueue(this._hits)
    this._hits.length = 0
    return this
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
   * @returns {string}
   * @private
   */
  _getOSVersion () {
    let output = null
    const osVersionPath = path.resolve(this.dir, 'osversion')
    try {
      output = fs.readFileSync(osVersionPath, 'utf8')
    } catch (err) {
      if (err.code !== 'ENOENT') throw err
      const execSync = require('child_process').execSync
      if (!execSync) {
        output = 'N/A'
      } else {
        if (os.platform() === 'win32') {
          output = `(Windows NT ${os.release()})`
        } else if (os.platform() === 'darwin') {
          output = `(Macintosh; Intel MAC OS X ${execSync('sw_vers -productVersion').toString().trim()})`
        } else if (os.platform() === 'linux') {
          output = `(X11; Linux ${os.release()})`
        }
      }
      fs.writeFileSync(osVersionPath, output)
    }
    return output
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
    return request(reqOptions, data)
  }

  /**
   * Returns hits queued.
   * @param [count] {number} - Number of hits to dequeue. Defaults to "all hits".
   * @return {string[]}
   * @private
   * @sync
   */
  _dequeue (count) {
    try {
      const queue = fs.readFileSync(this._queuePath, 'utf8')
      let hits
      try {
        hits = jsonToHits(queue)
      } catch (err) {
        hits = []
      }
      let output = []
      if (count) {
        output = hits.splice(0, count)
        fs.writeFileSync(this._queuePath, hitsToJson(hits))
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
   * Append an array of hits to the queue.
   * @param {string[]} - Array of hits.
   * @private
   * @sync
   * @chainable
   */
  _enqueue (hits) {
    hits = arrayify(hits)
    if (hits.length) {
      fs.appendFileSync(this._queuePath, hitsToJson(hits))
    }
    return this;
  }

  _getScreenResolution () {
    return process.stdout.columns && process.stdout.rows
      ? `${process.stdout.columns}x${process.stdout.rows}`
      : 'N/A'
  }

  _createHitsPayload (hits) {
    return arrayify(hits)
      .map(hit => {
        return Array.from(hit)
          .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
          .join('&')
      })
      .join(os.EOL)
  }
}

function hitsToJson (hits) {
  return arrayify(hits)
    .map(hit => {
      return mapToJson(hit) + os.EOL
    })
    .join('')
}

function jsonToHits (json) {
  if (json) {
    const hits = json.trim().split(os.EOL)
    return hits.map(hitJson => jsonToMap(hitJson))
  } else {
    return []
  }
}

function validGAResponse (response) {
  if (response.res.statusCode >= 300) {
    throw new Error('Unexpected response')
  } else {
    return response
  }
}

function mapToJson(map) {
  return JSON.stringify([...map])
}
function jsonToMap(json) {
  return new Map(JSON.parse(json))
}

module.exports = UsageStats
