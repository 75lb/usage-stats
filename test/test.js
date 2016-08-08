'use strict'
var test = require('test-runner')
var UsageStats = require('../')
var a = require('core-assert')

test('simple', function () {
  var assCount = 0
  UsageStats.prototype.send = function () {
    a.strictEqual(this._hits.length, 4)
    assCount++
  }

  var testStats = new UsageStats({
    appName: 'test',
    version: 'v1.0.0',
    tid: 'UA-00000000-0'
  })

  testStats.start()
  testStats.event('cat', 'action', 'label')
  testStats.screenView('test')
  testStats.end().send()
  a.strictEqual(assCount, 1)
})
