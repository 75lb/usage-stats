'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var TestRunner = require('test-runner');
var UsageStats = require('../lib/usage-stats');
var a = require('core-assert');
var fs = require('fs');
var path = require('path');
var os = require('os');
var rimraf = require('rimraf');
var runner = new TestRunner();

var tmpPath = path.resolve(__dirname, '../../tmp/api');
function getCacheDir(index) {
  var dir = path.resolve(tmpPath, 'test' + index);
  rimraf.sync(dir);
  return dir;
}

try {
  fs.mkdirSync(tmpPath);
} catch (err) {}

runner.test('new UsageStats(): trackingId required', function () {
  a.throws(function () {
    var testStats = new UsageStats();
  });
});

runner.test('.screenview(name): creates hit', function () {
  var testStats = new UsageStats('UA-00000000-0');
  testStats.screenView('test-screen');
  a.strictEqual(testStats._hits.length, 1);
  a.ok(/&t=screenview/.test(testStats._hits[0]));
  a.ok(/&cd=test-screen/.test(testStats._hits[0]));
});

runner.test('.event(category, action): creates hit', function () {
  var testStats = new UsageStats('UA-00000000-0');
  testStats.event('test-category', 'test-action');
  a.strictEqual(testStats._hits.length, 1);
  a.ok(/&ec=test-category/.test(testStats._hits[0]));
  a.ok(/&ea=test-action/.test(testStats._hits[0]));
});

runner.test('.event(): validation', function () {
  var testStats = new UsageStats('UA-00000000-0');
  a.throws(function () {
    testStats.event('test-category');
  });
  a.throws(function () {
    testStats.event();
  });
});

runner.test('._enqueue(hits): writes hits to cacheDir', function () {
  var testStats = new UsageStats('UA-00000000-0', { dir: getCacheDir(this.index) });
  testStats._enqueue(['hit1', 'hit2']);
  testStats._enqueue(['hit3']);
  testStats._enqueue(['hit4']);
  var queue = fs.readFileSync(testStats._queuePath, 'utf8');
  a.strictEqual(queue, 'hit1\nhit2\nhit3\nhit4\n');
});

runner.test('._dequeue(count): removes and returns hits', function () {
  var testStats = new UsageStats('UA-00000000-0', { dir: getCacheDir(this.index) });
  testStats._enqueue(['hit1', 'hit2', 'hit3', 'hit4']);

  var queue = testStats._dequeue(2);
  a.deepEqual(queue, ['hit1', 'hit2']);
  queue = testStats._dequeue(1);
  a.deepEqual(queue, ['hit3']);
  queue = testStats._dequeue(2);
  a.deepEqual(queue, ['hit4']);
  queue = testStats._dequeue(2);
  a.deepEqual(queue, []);
});

runner.test('.send(): screenview (live)', function () {
  var testStats = new UsageStats('UA-70853320-3', {
    name: 'usage-stats',
    version: require('../../package').version,
    dir: getCacheDir(this.index)
  });

  testStats.screenView(this.name);
  return testStats.send().then(function (responses) {
    return responses.map(function (response) {
      return response.res.statusCode;
    });
  });
});

runner.test('.send(): successful with nothing queued - still nothing queued', function () {
  var plan = 0;

  var UsageTest = function (_UsageStats) {
    _inherits(UsageTest, _UsageStats);

    function UsageTest() {
      _classCallCheck(this, UsageTest);

      return _possibleConstructorReturn(this, Object.getPrototypeOf(UsageTest).apply(this, arguments));
    }

    _createClass(UsageTest, [{
      key: '_request',
      value: function _request(reqOptions, data) {
        return Promise.resolve({ res: { statusCode: 200 }, data: 'test' });
      }
    }]);

    return UsageTest;
  }(UsageStats);

  var testStats = new UsageTest('UA-00000000-0', { dir: getCacheDir(this.index) });
  testStats.screenView('test');
  return testStats.send().then(function (responses) {
    a.strictEqual(responses.length, 1);
    a.strictEqual(responses[0].data, 'test');
    var queued = testStats._dequeue();
    a.ok(!queued.length);
  });
});

runner.test('.send(): successful with something queued - all hits sent and queue emptied', function () {
  var UsageTest = function (_UsageStats2) {
    _inherits(UsageTest, _UsageStats2);

    function UsageTest() {
      _classCallCheck(this, UsageTest);

      return _possibleConstructorReturn(this, Object.getPrototypeOf(UsageTest).apply(this, arguments));
    }

    _createClass(UsageTest, [{
      key: '_request',
      value: function _request(reqOptions, data) {
        var lines = data.trim().split(os.EOL);
        a.ok(/hit1/.test(lines[0]));
        a.ok(/cd=test/.test(lines[1]));
        return Promise.resolve({ res: { statusCode: 200 }, data: 'test' });
      }
    }]);

    return UsageTest;
  }(UsageStats);

  var testStats = new UsageTest('UA-70853320-3', {
    name: 'usage-stats',
    version: require('../../package').version,
    dir: getCacheDir(this.index)
  });
  testStats._enqueue(['hit1']);
  testStats.screenView('test');
  return testStats.send().then(function (responses) {
    var queued = testStats._dequeue();
    a.strictEqual(queued.length, 0);
  });
});

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
    dir: getCacheDir(this.index),
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