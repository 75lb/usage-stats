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

runner.test('.abort(): called ad-hoc', function () {
  // what are the effects of calling .abort() before .send()
  // what are the effects of calling .abort() after .send() on the same tick
})
