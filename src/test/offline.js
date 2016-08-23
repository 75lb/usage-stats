'use strict'
const TestRunner = require('test-runner')
const UsageStats = require('../lib/usage-stats')
const a = require('core-assert')
const fs = require('fs')
const path = require('path')
const os = require('os')
const rimraf = require('rimraf')
const runner = new TestRunner()

const tmpPath = path.resolve(__dirname, '../../tmp/offline')
function getCacheDir (index) {
  const dir = path.resolve(tmpPath, 'test' + index)
  rimraf.sync(dir)
  return dir
}

try {
  fs.mkdirSync(tmpPath)
} catch (err) {
  // exists
}

runner.test('.send(): failed with nothing queued - hit is queued', function () {
  class UsageTest extends UsageStats {
    _request () {
      return Promise.reject(new Error('failed'))
    }
  }

  const testStats = new UsageTest('UA-00000000-0', { dir: getCacheDir(this.index) })
  testStats.screenView('test')
  return testStats.send()
    .then(responses => {
      const queued = testStats._dequeue()
      a.strictEqual(queued.length, 1)
      a.ok(/cd=test/.test(queued[0]))
    })
})

runner.test('.send(): failed with something queued - all hits queued', function () {
  class UsageTest extends UsageStats {
    _request (reqOptions, data) {
      const lines = data.trim().split(os.EOL)
      a.ok(/hit1/.test(lines[0]))
      a.ok(/cd=test/.test(lines[1]))
      return Promise.reject(new Error('failed'))
    }
  }

  const testStats = new UsageTest('UA-00000000-0', { dir: getCacheDir(this.index) })
  testStats._enqueue([ 'hit1' ])
  testStats.screenView('test')
  return testStats.send()
    .then(responses => {
      const queued = testStats._dequeue()
      a.strictEqual(queued.length, 2)
      a.ok(/hit1/.test(queued[0]))
      a.ok(/cd=test/.test(queued[1]))
    })
})
