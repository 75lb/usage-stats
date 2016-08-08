'use strict'
const request = require('req-then')
const url = require('url')
const reqOptions = url.parse('http://www.google-analytics.com/batch')
reqOptions.method = 'POST'

class UsageStats {
  constructor (options) {
    options = options || {}
    this.appName = options.appName
    this.version = options.version
    this._readClientId()
    const os = require('os')
    this.defaults = {
      v: 1,
      tid: options.tid,
      cid: this.cid,
      ds: 'app',
      ul: process.env.LANG,
      ua: `jsdoc2md/${options.version} (${os.type()}; ${os.release()})`,
      sr: `${process.stdout.rows}x${process.stdout.columns}`
    }
    this.hits = []
  }
  event (category, action, label, value) {
    const t = require('typical')
    const form = Object.assign(this.defaults, {
      t: 'event',
      ec: category,
      ea: action,
    })
    if (t.isDefined(label)) form.el = label
    if (t.isDefined(value)) form.ev = value
    this.hits.push(postData(form))
    return this
  }

  screenView (name) {
    const form = Object.assign(this.defaults, {
      t: 'screenview',
      an: this.appName,
      av: this.version,
      aid: process.version,
      cd: name
    })
    this.hits.push(postData(form))
    return this
  }

  send () {
    const payload = this.hits.join('\n')
    this.hits.length = 0
    // console.error(payload)
    return request(reqOptions, payload)
  }

  _readClientId () {
    if (!this.cid) {
      const os = require('os')
      const path = require('path')
      const fs = require('fs')
      const uuid = require('node-uuid')
      const tmpdir = path.resolve(os.tmpdir(), 'usage-stats')
      const cidPath = path.resolve(tmpdir, 'cid')
      try {
        this.cid = fs.readFileSync(cidPath, 'utf8')
      } catch (err) {
        if (err.code !== 'ENOENT') throw err
        this.cid = uuid.v4()
        try {
          fs.mkdirSync(tmpdir)
        } catch (err) {
          // exists
        }
        fs.writeFileSync(cidPath, this.cid)
      }
    }
  }
}

function postData (form) {
  return Object.keys(form)
    .map(key => {
      return `${key}=${form[key]}`
    })
    .join('&')
}

module.exports = UsageStats
