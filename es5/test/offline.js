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

var tmpPath = path.resolve(__dirname, '../../tmp/offline');
function getCacheDir(index) {
  var dir = path.resolve(tmpPath, 'test' + index);
  rimraf.sync(dir);
  return dir;
}

try {
  fs.mkdirSync(tmpPath);
} catch (err) {}

runner.test('.send(): failed with nothing queued - hit is queued', function () {
  var UsageTest = function (_UsageStats) {
    _inherits(UsageTest, _UsageStats);

    function UsageTest() {
      _classCallCheck(this, UsageTest);

      return _possibleConstructorReturn(this, Object.getPrototypeOf(UsageTest).apply(this, arguments));
    }

    _createClass(UsageTest, [{
      key: '_request',
      value: function _request() {
        return Promise.reject(new Error('failed'));
      }
    }]);

    return UsageTest;
  }(UsageStats);

  var testStats = new UsageTest('UA-00000000-0', { dir: getCacheDir(this.index) });
  testStats.screenView('test');
  return testStats.send().then(function (responses) {
    var queued = testStats._dequeue();
    a.strictEqual(queued.length, 1);
    a.ok(/cd=test/.test(queued[0]));
  });
});

runner.test('.send(): failed with something queued - all hits queued', function () {
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
        return Promise.reject(new Error('failed'));
      }
    }]);

    return UsageTest;
  }(UsageStats);

  var testStats = new UsageTest('UA-00000000-0', { dir: getCacheDir(this.index) });
  testStats._enqueue(['hit1']);
  testStats.screenView('test');
  return testStats.send().then(function (responses) {
    var queued = testStats._dequeue();
    a.strictEqual(queued.length, 2);
    a.ok(/hit1/.test(queued[0]));
    a.ok(/cd=test/.test(queued[1]));
  });
});