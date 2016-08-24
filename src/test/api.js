'use strict'
const TestRunner = require('test-runner')
const UsageStats = require('../lib/usage-stats')
const a = require('core-assert')
const fs = require('fs')
const path = require('path')
const os = require('os')
const rimraf = require('rimraf')
const runner = new TestRunner()

const tmpPath = path.resolve(__dirname, '../../tmp/api')
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

runner.test('new UsageStats(): trackingId required', function () {
  a.throws(function () {
    const testStats = new UsageStats()
  })
})

runner.test('.screenview(name): creates hit', function () {
  const testStats = new UsageStats('UA-00000000-0')
  testStats.screenView('test-screen')
  a.strictEqual(testStats._hits.length, 1)
  a.ok(/&t=screenview/.test(testStats._hits[0]))
  a.ok(/&cd=test-screen/.test(testStats._hits[0]))
})

runner.test('.event(category, action): creates hit', function () {
  const testStats = new UsageStats('UA-00000000-0')
  testStats.event('test-category', 'test-action')
  a.strictEqual(testStats._hits.length, 1)
  a.ok(/&ec=test-category/.test(testStats._hits[0]))
  a.ok(/&ea=test-action/.test(testStats._hits[0]))
})

runner.test('.event(): validation', function () {
  const testStats = new UsageStats('UA-00000000-0')
  a.throws(function () {
    testStats.event('test-category')
  })
  a.throws(function () {
    testStats.event()
  })
})

runner.test('._enqueue(hits): writes hits to cacheDir', function () {
  const testStats = new UsageStats('UA-00000000-0', { dir: getCacheDir(this.index) })
  testStats._enqueue([ 'hit1', 'hit2' ])
  testStats._enqueue([ 'hit3' ])
  testStats._enqueue([ 'hit4' ])
  const queue = fs.readFileSync(testStats._queuePath, 'utf8')
  a.strictEqual(queue, 'hit1\nhit2\nhit3\nhit4\n')
})

runner.test('._dequeue(count): removes and returns hits', function () {
  const testStats = new UsageStats('UA-00000000-0', { dir: getCacheDir(this.index) })
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

runner.test('.send(): screenview (live)', function () {
  const testStats = new UsageStats('UA-70853320-4', {
    name: 'usage-stats',
    version: require('../../package').version,
    dir: getCacheDir(this.index)
  })

  testStats.screenView(this.name)
  return testStats.send()
    .then(responses => {
      return responses.map(response => response.res.statusCode)
    })
})

runner.test('.send(): successful with nothing queued - still nothing queued', function () {
  const plan = 0

  class UsageTest extends UsageStats {
    _request (reqOptions, data) {
      return Promise.resolve({ res: { statusCode: 200 }, data: 'test' })
    }
  }

  const testStats = new UsageTest('UA-00000000-0', { dir: getCacheDir(this.index) })
  testStats.screenView('test')
  return testStats.send()
    .then(responses => {
      a.strictEqual(responses.length, 1)
      a.strictEqual(responses[0].data, 'test')
      const queued = testStats._dequeue()
      a.ok(!queued.length)
    })
})

runner.test('.send(): successful with something queued - all hits sent and queue emptied', function () {
  class UsageTest extends UsageStats {
    _request (reqOptions, data) {
      const lines = data.trim().split(os.EOL)
      a.ok(/hit1/.test(lines[0]))
      a.ok(/cd=test/.test(lines[1]))
      return Promise.resolve({ res: { statusCode: 200 }, data: 'test' })
    }
  }

  const testStats = new UsageTest('UA-00000000-0', {
    name: 'usage-stats',
    version: require('../../package').version,
    dir: getCacheDir(this.index)
  })
  testStats._enqueue([ 'hit1' ])
  testStats.screenView('test')
  return testStats.send()
    .then(responses => {
      const queued = testStats._dequeue()
      a.strictEqual(queued.length, 0)
    })
})

runner.test('.abort(): abort and queue hit', function () {
  const http = require('http')
  const server = http.createServer((req, res) => {
    setTimeout(() => {
      res.statusCode = 200
      res.end('yeah?')
    }, 2000)
  })
  server.listen(9000)

  const testStats = new UsageStats('UA-00000000-0', {
    dir: getCacheDir(this.index),
    url: 'http://localhost:9000'
  })
  testStats.screenView('test')

  return new Promise((resolve, reject) => {
    testStats.send()
      .then(responses => {
        const response = responses[0]
        a.strictEqual(response.err.name, 'aborted')
        const queued = testStats._dequeue()
        a.strictEqual(queued.length, 1)
        server.close()
        resolve()
      })
      .catch(err => {
        server.close()
        reject()
      })

    testStats.abort()
  })
})
