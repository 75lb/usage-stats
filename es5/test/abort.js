'use strict';

var TestRunner = require('test-runner');
var UsageStats = require('../../');
var a = require('core-assert');
var os = require('os');
var runner = new TestRunner();
var shared = require('./lib/shared');

runner.test('.abort(): abort and queue hit', function () {
  var http = require('http');
  var server = http.createServer(function (req, res) {
    setTimeout(function () {
      res.statusCode = 200;
      res.end('yeah?');
    }, 2000);
  });
  server.listen(9000);

  var testStats = new UsageStats('UA-00000000-0', {
    dir: shared.getCacheDir(this.index, 'abort'),
    url: 'http://localhost:9000'
  });
  testStats.screenView('test');

  return new Promise(function (resolve, reject) {
    testStats.send().then(function (responses) {
      var response = responses[0];
      a.strictEqual(response.err.name, 'aborted');
      var queued = testStats._dequeue();
      a.strictEqual(queued.length, 1);
      server.close();
      resolve();
    }).catch(function (err) {
      server.close();
      reject();
    });

    testStats.abort();
  });
});

runner.test('.abort(): called before .send()', function () {
  var testStats = new UsageStats('UA-00000000-0');
  testStats.screenView('test');
  testStats.abort();
  a.ok(!this._aborted);
});

runner.test('.abort(): multiple requests', function () {
  var http = require('http');
  var server = http.createServer(function (req, res) {
    setTimeout(function () {
      res.statusCode = 200;
      res.end('yeah?');
    }, 2000);
  });
  server.listen(9010);

  var testStats = new UsageStats('UA-00000000-0', {
    dir: shared.getCacheDir(this.index, 'abort'),
    url: 'http://localhost:9010'
  });

  for (var i = 0; i < 100; i++) {
    testStats._enqueue(new Map([['hit', i]]));
  }

  return new Promise(function (resolve, reject) {
    testStats.send().then(function (responses) {
      a.strictEqual(responses.length, 5);
      a.strictEqual(responses[0].err.name, 'aborted');
      a.strictEqual(responses[1].err.name, 'aborted');
      a.strictEqual(responses[2].err.name, 'aborted');
      a.strictEqual(responses[3].err.name, 'aborted');
      a.strictEqual(responses[4].err.name, 'aborted');

      var queued = testStats._dequeue();
      a.strictEqual(queued.length, 100);
      a.strictEqual(testStats._aborted, false);
      server.close();
      resolve();
    }).catch(function (err) {
      console.error(err.stack);
      server.close();
      reject();
    });

    testStats.abort();
  });
});