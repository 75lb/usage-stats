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

runner.test('.abort(): called ad-hoc', function () {});