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
    this.defaults = {
      v: 1,
      tid: options.tid,
      cid: 1,
      ds: 'app',
      ul: process.env.LANG,
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
      // .then(response => console.error(response.res.statusCode))
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
