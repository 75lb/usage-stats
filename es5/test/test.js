'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var test = require('test-runner');
var UsageStats = require('../lib/usage-stats');
var a = require('core-assert');
var fs = require('fs');
var path = require('path');

test('trackingId required', function () {
  a.throws(function () {
    var testStats = new UsageStats();
  });
});

test('.screenview(name)', function () {
  var testStats = new UsageStats('UA-00000000-0');
  testStats.screenView('test-screen');
  a.strictEqual(testStats._hits.length, 1);
  a.ok(/&t=screenview/.test(testStats._hits[0]));
  a.ok(/&cd=test-screen/.test(testStats._hits[0]));
});

test('.event(category, action)', function () {
  var testStats = new UsageStats('UA-00000000-0');
  testStats.event('test-category', 'test-action');
  a.strictEqual(testStats._hits.length, 1);
  a.ok(/&ec=test-category/.test(testStats._hits[0]));
  a.ok(/&ea=test-action/.test(testStats._hits[0]));
});

test('.event() validation', function () {
  var testStats = new UsageStats('UA-00000000-0');
  a.throws(function () {
    testStats.event('test-category');
  });
});

test('._enqueue(hits)', function () {
  var testStats = new UsageStats('UA-00000000-0');
  testStats._queuePath = path.resolve(testStats._dir, 'test-queue.json');
  fs.writeFileSync(testStats._queuePath, '');
  testStats._enqueue(['hit1', 'hit2']);
  testStats._enqueue(['hit3']);
  testStats._enqueue(['hit4']);
  var queue = fs.readFileSync(testStats._queuePath, 'utf8');
  a.strictEqual(queue, 'hit1\nhit2\nhit3\nhit4\n');
});

test('._dequeue(count)', function () {
  var testStats = new UsageStats('UA-00000000-0');
  testStats._queuePath = path.resolve(testStats._dir, 'test-queue2.json');
  fs.writeFileSync(testStats._queuePath, '');
  testStats._enqueue(['hit1', 'hit2', 'hit3', 'hit4']);

  var queue = testStats._dequeue(2);
  a.deepEqual(queue, ['hit1', 'hit2']);
  var queue = testStats._dequeue(1);
  a.deepEqual(queue, ['hit3']);
  var queue = testStats._dequeue(2);
  a.deepEqual(queue, ['hit4']);
  var queue = testStats._dequeue(2);
  a.deepEqual(queue, []);
});

test('successful send, nothing queued', function () {
  var plan = 0;

  var UsageTest = function (_UsageStats) {
    _inherits(UsageTest, _UsageStats);

    function UsageTest(tid, options) {
      _classCallCheck(this, UsageTest);

      var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(UsageTest).call(this, tid, options));

      _this._queuePath = path.resolve(_this._dir, 'test-queue3.json');
      fs.writeFileSync(_this._queuePath, '');
      return _this;
    }

    _createClass(UsageTest, [{
      key: '_request',
      value: function _request(reqOptions, data) {
        return Promise.resolve({ res: { statusCode: 200 }, data: 'test' });
      }
    }]);

    return UsageTest;
  }(UsageStats);

  var testStats = new UsageTest('UA-00000000-0');
  testStats.screenView('test');
  return testStats.send().then(function (responses) {
    var queued = testStats._dequeue();

    a.ok(!queued.length);
  });
});

test('failed send, something queued', function () {
  var plan = 0;

  var UsageTest = function (_UsageStats2) {
    _inherits(UsageTest, _UsageStats2);

    function UsageTest(tid, options) {
      _classCallCheck(this, UsageTest);

      var _this2 = _possibleConstructorReturn(this, Object.getPrototypeOf(UsageTest).call(this, tid, options));

      _this2._queuePath = path.resolve(_this2._dir, 'test-queue4.json');
      fs.writeFileSync(_this2._queuePath, '');
      return _this2;
    }

    _createClass(UsageTest, [{
      key: '_request',
      value: function _request(reqOptions, data) {
        return Promise.reject('failed');
      }
    }]);

    return UsageTest;
  }(UsageStats);

  var testStats = new UsageTest('UA-00000000-0');
  testStats.screenView('test');
  return testStats.send().then(function (responses) {
    var queued = testStats._dequeue();

    a.strictEqual(queued.length, 1);
  });
});