'use strict'
const request = require('req-then')
const url = require('url')
const path = require('path')
const os = require('os')
const fs = require('fs')
const reqOptions = url.parse('http://www.google-analytics.com/batch')
reqOptions.method = 'POST'

class UsageStats {
  constructor (options) {
    options = options || {}
    this.tmpdir = path.resolve(os.tmpdir(), 'usage-stats')
    this.queuePath = path.resolve(this.tmpdir, 'queue')
    this.appName = options.appName
    this.version = options.version
    this._readClientId()
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
  start () {
    this.hits.push({ sc: 'start' })
    return this
  }
  end () {
    this.hits.push({ sc: 'end' })
    return this
  }
  event (category, action, label, value) {
    const t = require('typical')
    const form = Object.assign({}, this.defaults, {
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
    const form = Object.assign({}, this.defaults, {
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
    let queued = ''
    try {
      queued = fs.readFileSync(this.queuePath, 'utf8')
      fs.unlinkSync(this.queuePath)
    } catch (err) {
      if (err.code !== 'ENOENT') throw err
    }
    const lines = queued ? queued.trim().split('\n').concat(this.hits) : this.hits.slice(0)
    this.hits.length = 0
    while (lines.length) {
      const batch = lines.splice(0, 5).join('\n') + '\n'
      request(reqOptions, batch)
        .catch(err => {
          try {
            fs.appendFileSync(this.queuePath, batch)
          } catch (err) {
            if (err.code !== 'ENOENT') throw err
            try {
              fs.mkdirSync(this.tmpdir)
            } catch (err) {
              // exists
            }
            fs.appendFileSync(this.queuePath, batch)
          }
        })
    }
    return this
  }

  _readClientId () {
    if (!this.cid) {
      const uuid = require('node-uuid')
      const cidPath = path.resolve(this.tmpdir, 'cid')
      try {
        this.cid = fs.readFileSync(cidPath, 'utf8')
      } catch (err) {
        if (err.code !== 'ENOENT') throw err
        this.cid = uuid.v4()
        try {
          fs.mkdirSync(this.tmpdir)
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
