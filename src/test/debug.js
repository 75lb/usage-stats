'use strict'
const TestRunner = require('test-runner')
const UsageStats = require('../lib/usage-stats')
const a = require('core-assert')
const fs = require('fs')
const path = require('path')
const rimraf = require('rimraf')

const tmpPath = path.resolve(__dirname, '../../tmp/test')
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

const runner = new TestRunner()

runner.test('.send({ debug: true }) live - screenview', function () {
  const testStats = new UsageStats('UA-70853320-3', {
    name: 'usage-stats',
    version: require('../../package').version,
    dir: getCacheDir(this.index)
  })

  testStats.screenView(this.name)
  return testStats.send({ debug: true })
    .then(response => {
      a.strictEqual(response.hits.length, 1)
      a.ok(/t=screenview/.test(response.hits[0]))
      a.strictEqual(response.result.hitParsingResult[0].valid, true)
      const queued = testStats._dequeue()
      a.strictEqual(queued.length, 1)
    })
})

runner.test('.send({ debug: true }) live - screenview with a queue', function () {
  const testStats = new UsageStats('UA-70853320-3', {
    name: 'usage-stats',
    version: require('../../package').version,
    dir: getCacheDir(this.index)
  })
  testStats._enqueue([ 'v=1' ])
  testStats.screenView(this.name)
  return testStats.send({ debug: true })
    .then(response => {
      // console.error(require('util').inspect(response, { depth: 3, colors: true }))
      a.strictEqual(response.hits.length, 2)
      a.ok(/t=screenview/.test(response.hits[1]))
      a.strictEqual(response.result.hitParsingResult[1].valid, true)
      const queued = testStats._dequeue()
      // console.error(queued)
      a.strictEqual(queued.length, 2)
    })
})
