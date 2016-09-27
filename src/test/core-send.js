'use strict'
const TestRunner = require('test-runner')
const UsageStats = require('../../')
const a = require('core-assert')
const os = require('os')
const runner = new TestRunner()
const shared = require('./lib/shared')

runner.test('.send(): screenview (live)', function () {
  const testStats = new UsageStats('UA-70853320-4', {
    name: 'usage-stats',
    version: require('../../package').version,
    dir: shared.getCacheDir(this.index)
  })

  testStats.screenView(this.name)
  return testStats.send()
    .then(responses => {
      if (responses[0].err && responses[0].err.code === 'ENOTFOUND') return Promise.resolve("offline, can't test")
      return responses.map(response => response.res.statusCode)
    })
})

runner.test('.send(): offline throws', function () {
  class OfflineUsageStats extends UsageStats {
    _request () {
      return Promise.reject(new Error('offline'))
    }
  }

  const testStats = new OfflineUsageStats('UA-70853320-4', {
    name: 'usage-stats',
    version: require('../../package').version,
    dir: shared.getCacheDir(this.index)
  })

  testStats.screenView(this.name)
  return testStats.send()
    .catch(err => {
      a.strictEqual(err.message, 'offline')
    })
})
