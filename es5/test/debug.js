'use strict';

var TestRunner = require('test-runner');
var UsageStats = require('../lib/usage-stats');
var a = require('core-assert');
var fs = require('fs');
var path = require('path');
var rimraf = require('rimraf');

var tmpPath = path.resolve(__dirname, '../../tmp/debug');
function getCacheDir(index) {
  var dir = path.resolve(tmpPath, 'test' + index);
  rimraf.sync(dir);
  return dir;
}

try {
  fs.mkdirSync(tmpPath);
} catch (err) {}

var runner = new TestRunner();

runner.test('.send({ debug: true }) live - screenview', function () {
  var testStats = new UsageStats('UA-70853320-3', {
    name: 'usage-stats',
    version: require('../../package').version,
    dir: getCacheDir(this.index)
  });

  testStats.screenView(this.name);
  return testStats.send({ debug: true }).then(function (response) {
    a.strictEqual(response.hits.length, 1);
    a.ok(/t=screenview/.test(response.hits[0]));
    a.strictEqual(response.result.hitParsingResult[0].valid, true);
    var queued = testStats._dequeue();
    a.strictEqual(queued.length, 1);
  });
});

runner.test('.send({ debug: true }) live - screenview with a queue', function () {
  var testStats = new UsageStats('UA-70853320-3', {
    name: 'usage-stats',
    version: require('../../package').version,
    dir: getCacheDir(this.index)
  });
  testStats._enqueue(['v=1']);
  testStats.screenView(this.name);
  return testStats.send({ debug: true }).then(function (response) {
    a.strictEqual(response.hits.length, 2);
    a.ok(/t=screenview/.test(response.hits[1]));
    a.strictEqual(response.result.hitParsingResult[1].valid, true);
    var queued = testStats._dequeue();

    a.strictEqual(queued.length, 2);
  });
});