'use strict'
const TestRunner = require('test-runner')
const UsageStats = require('../../')
const a = require('core-assert')
const os = require('os')
const runner = new TestRunner()
const shared = require('./lib/shared')

runner.test('.send(): failed with nothing queued - throws', function () {
  class UsageTest extends UsageStats {
    _request () {
      return Promise.reject(new Error('failed'))
    }
  }

  const testStats = new UsageTest('UA-00000000-0', { dir: shared.getCacheDir(this.index, 'offline') })
  testStats.screenView('test')
  return new Promise((resolve, reject) => {
    testStats.send()
      .then(responses => {
        reject(new Error("shouldn't reach here"))
      })
      .catch(err => {
        if (err.message === 'failed') {
          resolve()
        } else {
          reject(err)
        }
      })
  })
})

runner.test('.send(): failed with nothing queued - hit is queued', function () {
  class UsageTest extends UsageStats {
    _request () {
      return Promise.reject(new Error('failed'))
    }
  }

  const testStats = new UsageTest('UA-00000000-0', { dir: shared.getCacheDir(this.index, 'offline') })
  testStats.screenView('test')
  return new Promise((resolve, reject) => {
    testStats.send()
      .then(() => {
        reject(new Error('should not reach here'))
      })
      .catch(err => {
        const queued = testStats._dequeue()
        a.strictEqual(queued.length, 1)
        a.strictEqual(queued[0].get('cd'), 'test')
        resolve()
      })
      .catch(reject)
  })
})

runner.test('.send(): failed with something queued - all hits queued', function () {
  class UsageTest extends UsageStats {
    _request () {
      return Promise.reject(new Error('failed'))
    }
  }

  const testStats = new UsageTest('UA-00000000-0', { dir: shared.getCacheDir(this.index, 'offline') })
  const hit = testStats._createHit(new Map([[ 'one', 'test' ]]))
  testStats._enqueue(hit)
  testStats.screenView('test')
  return new Promise((resolve, reject) => {
    testStats.send()
      .then(() => {
        reject(new Error('should not reach here'))
      })
      .catch(responses => {
        const queued = testStats._dequeue()
        a.strictEqual(queued.length, 2)
        a.strictEqual(queued[0].get('one'), 'test')
        a.strictEqual(queued[1].get('cd'), 'test')
        resolve()
      })
      .catch(reject)
  })
})
