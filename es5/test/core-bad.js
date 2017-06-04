'use strict';

var TestRunner = require('test-runner');
var UsageStats = require('../../');
var a = require('core-assert');
var runner = new TestRunner();
var shared = require('./lib/shared');

runner.test('no write permission', function () {
  var testStats = new UsageStats('UA-00000000-0', { dir: '/etc/yeah' });
  var result = testStats._getClientId();
  a.strictEqual(result, '<unknown>');
  testStats.dir = shared.getCacheDir(100 + this.index);
  result = testStats._getClientId();
  a.ok(result.length > 10);
});