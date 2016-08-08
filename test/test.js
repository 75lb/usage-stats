'use strict'
var test = require('test-runner')
var UsageStats = require('../')
var a = require('core-assert')

test('simple', function () {
  class TestStats extends UsageStats {
    send () {
      a.strictEqual(this._hits.length, 4)
    }
    _readClientId () {
      this._cid = 'cid'
    }
  }

  const testStats = new TestStats({
    appName: 'test',
    version: 'v1.0.0',
    tid: 'UA-00000000-0'
  })

  testStats.start()
  testStats.event('cat', 'action', 'label')
  testStats.screenView('test')
  testStats.end().send()
})
