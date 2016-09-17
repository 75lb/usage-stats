'use strict';

var TestRunner = require('test-runner');
var UsageStats = require('../../');
var a = require('core-assert');
var shared = require('./lib/shared');

var runner = new TestRunner();

runner.test('.send({ debug: true }) live screenview: resolves with result, hit queued', function () {
  var testStats = new UsageStats('UA-70853320-4', {
    name: 'usage-stats',
    version: require('../../package').version,
    dir: shared.getCacheDir(this.index, 'debug')
  });

  testStats.screenView(this.name);
  return testStats.send({ debug: true }).then(function (responses) {
    var response = responses[0];
    if (response.err && response.err.code === 'ENOTFOUND') return Promise.resolve("offline, can't test");
    a.strictEqual(response.hits.length, 1);
    a.strictEqual(response.hits[0].get('t'), 'screenview');
    a.strictEqual(response.result.hitParsingResult[0].valid, true);
    var queued = testStats._dequeue();
    a.strictEqual(queued.length, 0);
  });
});

runner.test('.send({ debug: true }) live screenview with something queued: resolves, queue correct', function () {
  var testStats = new UsageStats('UA-70853320-4', {
    name: 'usage-stats',
    version: require('../../package').version,
    dir: shared.getCacheDir(this.index, 'debug')
  });
  var hit = testStats._createHit(new Map([['one', 'test']]));
  testStats._enqueue(hit);
  testStats.screenView(this.name);
  return testStats.send({ debug: true }).then(function (responses) {
    var response = responses[0];
    if (response.err && response.err.code === 'ENOTFOUND') return Promise.resolve("offline, can't test");
    a.strictEqual(response.hits.length, 2);
    a.strictEqual(response.hits[0].get('one'), 'test');
    a.strictEqual(response.hits[1].get('t'), 'screenview');
    a.strictEqual(response.result.hitParsingResult[1].valid, true);
    var queued = testStats._dequeue();
    a.strictEqual(queued.length, 0);
  });
});