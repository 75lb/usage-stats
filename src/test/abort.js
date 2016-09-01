'use strict'
const TestRunner = require('test-runner')
const UsageStats = require('../../')
const a = require('core-assert')
const os = require('os')
const runner = new TestRunner()
const shared = require('./lib/shared')

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
    dir: shared.getCacheDir(this.index, 'abort'),
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
        a.strictEqual(testStats._aborted, false)
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

runner.test('.abort(): called before .send()', function () {
  const testStats = new UsageStats('UA-00000000-0')
  testStats.screenView('test')
  testStats.abort()
  a.ok(!this._aborted)
})

runner.test('.abort(): multiple requests', function () {
  const http = require('http')
  const server = http.createServer((req, res) => {
    setTimeout(() => {
      res.statusCode = 200
      res.end('yeah?')
    }, 2000)
  })
  server.listen(9010)

  const testStats = new UsageStats('UA-00000000-0', {
    dir: shared.getCacheDir(this.index, 'abort'),
    url: 'http://localhost:9010'
  })

  for (let i = 0; i < 100; i++) {
    testStats._enqueue(new Map([[ 'hit', i ]]))
  }

  return new Promise((resolve, reject) => {
    testStats.send()
      .then(responses => {
        a.strictEqual(responses.length, 5)
        a.strictEqual(responses[0].err.name, 'aborted')
        a.strictEqual(responses[1].err.name, 'aborted')
        a.strictEqual(responses[2].err.name, 'aborted')
        a.strictEqual(responses[3].err.name, 'aborted')
        a.strictEqual(responses[4].err.name, 'aborted')

        const queued = testStats._dequeue()
        a.strictEqual(queued.length, 100)
        a.strictEqual(testStats._aborted, false)
        server.close()
        resolve()
      })
      .catch(err => {
        console.error(err.stack)
        server.close()
        reject()
      })

    testStats.abort()
  })
})

runner.test('.abort(): abort after a completed send is a no-op', function () {
  const http = require('http')
  const server = http.createServer((req, res) => {
    setTimeout(() => {
      res.statusCode = 200
      res.end('yeah?')
    }, 20)
  })
  server.listen(9020)

  const testStats = new UsageStats('UA-00000000-0', {
    dir: shared.getCacheDir(this.index, 'abort'),
    url: 'http://localhost:9020'
  })
  testStats.screenView('test')

  return new Promise((resolve, reject) => {
    testStats.send()
      .then(responses => {
        const response = responses[0]
        a.strictEqual(response.err, undefined)
        const queued = testStats._dequeue()
        a.strictEqual(queued.length, 0)
        a.strictEqual(testStats._aborted, false)
        testStats.abort()
        a.strictEqual(testStats._aborted, false)
        server.close()
        resolve()
      })
      .catch(err => {
        console.error(err.stack)
        server.close()
        reject()
      })
  })
})
