'use strict'
const request = require('req-then')
const url = require('url')
const reqOptions = url.parse('http://www.google-analytics.com/collect')
reqOptions.method = 'POST'
let defaults = {
  v: 1,
  tid: 'UA-70853320-3',
  cid: 1,
  ds: 'app',
  ul: process.env.LANG,
}

class UsageStats {
  constructor (appName, version) {
    this.appName = appName
    this.version = version
  }
  event (category, action, label) {
    const form = Object.assign(defaults, {
      t: 'event',
      ec: category,
      ea: action,
      el: label
    })
    console.error('event', category, action, label)
    return request(reqOptions, postData(form))
      .then(response => console.log(response.res.statusCode))
  }

  screenView (name) {
    const form = Object.assign(defaults, {
      t: 'screenview',
      an: this.appName,
      av: this.version,
      aid: process.version,
      cd: name
    })
    console.error('screenView', name, this.appName, this.version)
    return request(reqOptions, postData(form))
      .then(response => console.log(response.res.statusCode))
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
