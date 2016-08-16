'use strict'
var test = require('test-runner')
var UsageStats = require('../lib/usage-stats')
var a = require('core-assert')
var fs = require('fs')
var path = require('path')

test('trackingId required', function () {
  a.throws(function () {
    var testStats = new UsageStats()
  })
})

test('.screenview(name)', function () {
  var testStats = new UsageStats('UA-00000000-0')
  testStats.screenView('test-screen')
  a.strictEqual(testStats._hits.length, 1)
  a.ok(/&t=screenview/.test(testStats._hits[0]))
  a.ok(/&cd=test-screen/.test(testStats._hits[0]))
})

test('.event(category, action)', function () {
  var testStats = new UsageStats('UA-00000000-0')
  testStats.event('test-category', 'test-action')
  a.strictEqual(testStats._hits.length, 1)
  a.ok(/&ec=test-category/.test(testStats._hits[0]))
  a.ok(/&ea=test-action/.test(testStats._hits[0]))
})

test('.event() validation', function () {
  var testStats = new UsageStats('UA-00000000-0')
  a.throws(function () {
    testStats.event('test-category')
  })
})

test('._enqueue(hits)', function () {
  var testStats = new UsageStats('UA-00000000-0')
  testStats._queuePath = path.resolve(testStats._dir, 'test-queue.json')
  fs.writeFileSync(testStats._queuePath, '')
  testStats._enqueue([ 'hit1', 'hit2' ])
  testStats._enqueue([ 'hit3' ])
  testStats._enqueue([ 'hit4' ])
  var queue = fs.readFileSync(testStats._queuePath, 'utf8')
  a.strictEqual(queue, 'hit1\nhit2\nhit3\nhit4\n')
})

test('._dequeue(count)', function () {
  var testStats = new UsageStats('UA-00000000-0')
  testStats._queuePath = path.resolve(testStats._dir, 'test-queue2.json')
  fs.writeFileSync(testStats._queuePath, '')
  testStats._enqueue([ 'hit1', 'hit2', 'hit3', 'hit4' ])

  var queue = testStats._dequeue(2)
  a.deepEqual(queue, [ 'hit1', 'hit2' ])
  var queue = testStats._dequeue(1)
  a.deepEqual(queue, [ 'hit3' ])
  var queue = testStats._dequeue(2)
  a.deepEqual(queue, [ 'hit4' ])
  var queue = testStats._dequeue(2)
  a.deepEqual(queue, [])
})

test('successful send, nothing queued', function () {
  var plan = 0

  class UsageTest extends UsageStats {
    constructor (tid, options) {
      super(tid, options)
      this._queuePath = path.resolve(this._dir, 'test-queue3.json')
      fs.writeFileSync(this._queuePath, '')
    }
    _request (reqOptions, data) {
      // console.error(reqOptions)
      // console.error(data)
      return Promise.resolve({ res: { statusCode: 200 }, data: 'test' })
    }
  }

  var testStats = new UsageTest('UA-00000000-0')
  testStats.screenView('test')
  return testStats.send()
    .then(responses => {
      const queued = testStats._dequeue()
      // console.error(require('util').inspect(responses, { depth: 3, colors: true }))
      a.ok(!queued.length)
    })
})

test('failed send, something queued', function () {
  var plan = 0

  class UsageTest extends UsageStats {
    constructor (tid, options) {
      super(tid, options)
      this._queuePath = path.resolve(this._dir, 'test-queue4.json')
      fs.writeFileSync(this._queuePath, '')
    }
    _request (reqOptions, data) {
      // console.error(reqOptions)
      // console.error(data)
      return Promise.reject('failed')
    }
  }

  var testStats = new UsageTest('UA-00000000-0')
  testStats.screenView('test')
  return testStats.send()
    .then(responses => {
      const queued = testStats._dequeue()
      // console.error(require('util').inspect(queued, { depth: 3, colors: true }))
      a.strictEqual(queued.length, 1)
    })
})
