'use strict'
const test = require('test-runner')
const UsageStats = require('../lib/usage-stats')
const a = require('core-assert')
const fs = require('fs')
const path = require('path')
const os = require('os')

const tmpPath = path.resolve(__dirname, '../../tmp/test')
let pathCount = 0
function getCacheDir () {
  return path.resolve(tmpPath, 'test' + pathCount++)
}

try {
  fs.mkdirSync(tmpPath)
} catch (err) {
  // exists
}

test('trackingId required', function () {
  a.throws(function () {
    const testStats = new UsageStats()
  })
})

test('.screenview(name)', function () {
  const testStats = new UsageStats('UA-00000000-0')
  testStats.screenView('test-screen')
  a.strictEqual(testStats._hits.length, 1)
  a.ok(/&t=screenview/.test(testStats._hits[0]))
  a.ok(/&cd=test-screen/.test(testStats._hits[0]))
})

test('.event(category, action)', function () {
  const testStats = new UsageStats('UA-00000000-0')
  testStats.event('test-category', 'test-action')
  a.strictEqual(testStats._hits.length, 1)
  a.ok(/&ec=test-category/.test(testStats._hits[0]))
  a.ok(/&ea=test-action/.test(testStats._hits[0]))
})

test('.event() validation', function () {
  const testStats = new UsageStats('UA-00000000-0')
  a.throws(function () {
    testStats.event('test-category')
  })
})

test('._enqueue(hits)', function () {
  const testStats = new UsageStats('UA-00000000-0', { dir: getCacheDir() })
  fs.writeFileSync(testStats._queuePath, '')
  testStats._enqueue([ 'hit1', 'hit2' ])
  testStats._enqueue([ 'hit3' ])
  testStats._enqueue([ 'hit4' ])
  const queue = fs.readFileSync(testStats._queuePath, 'utf8')
  a.strictEqual(queue, 'hit1\nhit2\nhit3\nhit4\n')
})

test('._dequeue(count)', function () {
  const testStats = new UsageStats('UA-00000000-0', { dir: getCacheDir() })
  fs.writeFileSync(testStats._queuePath, '')
  testStats._enqueue([ 'hit1', 'hit2', 'hit3', 'hit4' ])

  let queue = testStats._dequeue(2)
  a.deepEqual(queue, [ 'hit1', 'hit2' ])
  queue = testStats._dequeue(1)
  a.deepEqual(queue, [ 'hit3' ])
  queue = testStats._dequeue(2)
  a.deepEqual(queue, [ 'hit4' ])
  queue = testStats._dequeue(2)
  a.deepEqual(queue, [])
})

test('successful send, nothing queued', function () {
  const plan = 0

  class UsageTest extends UsageStats {
    constructor (tid, options) {
      super(tid, options)
      fs.writeFileSync(this._queuePath, '')
    }
    _request (reqOptions, data) {
      return Promise.resolve({ res: { statusCode: 200 }, data: 'test' })
    }
  }

  const testStats = new UsageTest('UA-00000000-0', { dir: getCacheDir() })
  testStats.screenView('test')
  return testStats.send()
    .then(responses => {
      const queued = testStats._dequeue()
      a.ok(!queued.length)
    })
})

test('failed send, something queued', function () {
  class UsageTest extends UsageStats {
    constructor (tid, options) {
      super(tid, options)
      fs.writeFileSync(this._queuePath, '')
    }
    _request (reqOptions, data) {
      return Promise.reject('failed')
    }
  }

  const testStats = new UsageTest('UA-00000000-0', { dir: getCacheDir() })
  testStats.screenView('test')
  return testStats.send()
    .then(responses => {
      const queued = testStats._dequeue()
      a.strictEqual(queued.length, 1)
    })
})

test('.send() screenview (live)', function () {
  const testStats = new UsageStats('UA-70853320-3', {
    name: 'usage-stats',
    version: require('../../package').version,
    dir: getCacheDir()
  })

  testStats.screenView(this.name)
  return testStats.send()
    .then(responses => {
      return responses.map(response => response.data)
    })
})

test.skip('successful send with something queued', function () {
  class UsageTest extends UsageStats {
    constructor (tid, options) {
      super(tid, options)
      fs.writeFileSync(this._queuePath, 'test=something-queued\n')
    }
    _request (reqOptions, data) {
      const lines = data.trim().split(os.EOL)
      a.ok(/something-queued/.test(lines[0]))
      a.ok(/cd=test/.test(lines[1]))
      return Promise.resolve({ res: { statusCode: 200 }, data: 'test' })
    }
  }

  const testStats = new UsageStats('UA-70853320-3', {
    name: 'usage-stats',
    version: require('../../package').version,
    dir: getCacheDir()
  })

  testStats.screenView('test')
  return testStats.send()
    .then(responses => {
      const queued = testStats._dequeue()
      a.strictEqual(queued.length, 0)
    })
})
