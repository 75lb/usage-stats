'use strict';

var TestRunner = require('test-runner');
var UsageStats = require('../../');
var a = require('core-assert');
var fs = require('fs');
var runner = new TestRunner();
var shared = require('./lib/shared');

runner.test('new UsageStats(): trackingId required', function () {
  a.throws(function () {
    new UsageStats();
  });
});

runner.test('._createHit(map): returns map of defaults merged with supplied', function () {
  var testStats = new UsageStats('UA-00000000-0');
  a.throws(function () {
    return testStats._createHit('fail');
  });
  var hit = testStats._createHit(new Map([['cd1', 'test']]));
  a.strictEqual(hit.get('v'), 1);
  a.strictEqual(hit.get('tid'), 'UA-00000000-0');
  a.strictEqual(hit.get('cd1'), 'test');
});

runner.test('.defaults: sent with every hit', function () {
  var testStats = new UsageStats('UA-00000000-0');
  a.strictEqual(testStats.defaults.has('v'), true);
  a.strictEqual(testStats.defaults.has('tid'), true);

  testStats.defaults.set('cd1', 'test');
  a.strictEqual(testStats.defaults.has('cd1'), true);
});

runner.test('.screenview(name): creates hit', function () {
  var testStats = new UsageStats('UA-00000000-0');
  testStats.screenView('test-screen');
  a.strictEqual(testStats._hits.length, 1);
  a.strictEqual(testStats._hits[0].get('t'), 'screenview');
  a.strictEqual(testStats._hits[0].get('cd'), 'test-screen');
});

runner.test('.screenview(name, params)', function () {
  var testStats = new UsageStats('UA-00000000-0');
  var params = new Map();
  params.set('cm1', 1);
  params.set('cm2', 2);
  testStats.screenView('test-screen', { hitParams: params });
  a.strictEqual(testStats._hits.length, 1);
  a.strictEqual(testStats._hits[0].get('t'), 'screenview');
  a.strictEqual(testStats._hits[0].get('cd'), 'test-screen');
  a.strictEqual(testStats._hits[0].get('cm1'), 1);
  a.strictEqual(testStats._hits[0].get('cm2'), 2);
});

runner.test('.start(sessionParams): applies sessionParams to all hits in session', function () {
  var testStats = new UsageStats('UA-00000000-0');
  var sessionParams = new Map([['cd1', 'one']]);
  testStats.start(sessionParams);
  testStats.screenView('screen');
  a.strictEqual(testStats._hits[0].get('cd'), 'screen');
  a.strictEqual(testStats._hits[0].get('cd1'), 'one');
  a.strictEqual(testStats._hits[0].get('sc'), 'start');

  testStats.event('category1', 'action1');
  a.strictEqual(testStats._hits[1].get('ec'), 'category1');
  a.strictEqual(testStats._hits[1].get('cd1'), 'one');
  a.strictEqual(testStats._hits[1].get('sc'), undefined);

  testStats.event('category2', 'action2');
  a.strictEqual(testStats._hits[2].get('ec'), 'category2');
  a.strictEqual(testStats._hits[2].get('cd1'), 'one');
  a.strictEqual(testStats._hits[2].get('sc'), undefined);

  testStats.end();
  a.strictEqual(testStats._hits[2].get('sc'), 'end');

  testStats.screenView('screen2');
  a.strictEqual(testStats._hits[3].get('cd'), 'screen2');
  a.strictEqual(testStats._hits[3].get('cd1'), undefined);
  a.strictEqual(testStats._hits[3].get('sc'), undefined);

  a.strictEqual(testStats._hits.length, 4);
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

runner.test('.event(category, action): no optionals, creates hit', function () {
  var testStats = new UsageStats('UA-00000000-0');
  testStats.event('test-category', 'test-action');
  a.strictEqual(testStats._hits.length, 1);
  a.strictEqual(testStats._hits[0].get('ec'), 'test-category');
  a.strictEqual(testStats._hits[0].get('ea'), 'test-action');
  a.strictEqual(testStats._hits[0].has('el'), false);
  a.strictEqual(testStats._hits[0].has('ev'), false);
});

runner.test('.event(category, action): with optionals, creates hit', function () {
  var testStats = new UsageStats('UA-00000000-0');
  testStats.event('test-category', 'test-action', {
    label: 'label',
    value: 'value'
  });
  a.strictEqual(testStats._hits.length, 1);
  a.strictEqual(testStats._hits[0].get('ec'), 'test-category');
  a.strictEqual(testStats._hits[0].get('ea'), 'test-action');
  a.strictEqual(testStats._hits[0].get('el'), 'label');
  a.strictEqual(testStats._hits[0].get('ev'), 'value');
});

runner.test('.event(options, hitParams): creates hit and applies hit params', function () {
  var testStats = new UsageStats('UA-00000000-0');
  testStats.event('test-category', 'test-action', {
    hitParams: new Map([['cd1', 'cd1'], ['cd2', 'cd2']])
  });
  a.strictEqual(testStats._hits.length, 1);
  a.strictEqual(testStats._hits[0].get('ec'), 'test-category');
  a.strictEqual(testStats._hits[0].get('ea'), 'test-action');
  a.strictEqual(testStats._hits[0].get('cd1'), 'cd1');
  a.strictEqual(testStats._hits[0].get('cd2'), 'cd2');
});

runner.test('._enqueue(hits): writes hits to cacheDir', function () {
  var testStats = new UsageStats('UA-00000000-0', { dir: shared.getCacheDir(this.index) });
  var hit1 = new Map([['hit', 1]]);
  var hit2 = new Map([['hit', 2]]);
  var hit3 = new Map([['hit', 3]]);
  testStats._enqueue([hit1, hit2]);
  testStats._enqueue(hit3);
  var queue = fs.readFileSync(testStats._queuePath, 'utf8');
  a.strictEqual(queue, '[["hit",1]]\n[["hit",2]]\n[["hit",3]]\n');
});

runner.test('._enqueue(): remove session control from queued hits', function () {
  var testStats = new UsageStats('UA-00000000-0', { dir: shared.getCacheDir(this.index) });
  var hit1 = new Map([['hit', 1], ['sc', 'start']]);
  testStats._enqueue(hit1);
  var queue = fs.readFileSync(testStats._queuePath, 'utf8');
  a.strictEqual(queue, '[["hit",1]]\n');
  var hit2 = new Map([['hit', 2], ['cd1', 'test']]);
  testStats._enqueue(hit2);
  queue = fs.readFileSync(testStats._queuePath, 'utf8');
  a.strictEqual(queue, '[["hit",1]]\n[["hit",2],["cd1","test"]]\n');
});

runner.test('._dequeue(count): removes and returns hits', function () {
  var testStats = new UsageStats('UA-00000000-0', { dir: shared.getCacheDir(this.index) });
  var hit1 = new Map([['hit', 1]]);
  var hit2 = new Map([['hit', 2]]);
  var hit3 = new Map([['hit', 3]]);
  var hit4 = new Map([['hit', 4]]);
  testStats._enqueue([hit1, hit2, hit3, hit4]);

  var queue = testStats._dequeue(2);
  a.deepEqual(queue, [hit1, hit2]);
  queue = testStats._dequeue(1);
  a.deepEqual(queue, [hit3]);
  queue = testStats._dequeue(2);
  a.deepEqual(queue, [hit4]);
  queue = testStats._dequeue(2);
  a.deepEqual(queue, []);
});

runner.test('._createHitsPayload(hits): returns correct form data', function () {
  var testStats = new UsageStats('UA-00000000-0', { dir: shared.getCacheDir(this.index) });
  var hit1 = new Map([['hit', 1]]);
  var hit2 = new Map([['hit', 2], ['ua', 'test']]);
  var hit3 = new Map([['hit', 3], ['cd1', 'cd1'], ['ua', 'ua']]);
  var hits = [hit1, hit2, hit3];
  var result = testStats._createHitsPayload(hits);
  a.strictEqual(result, 'hit=1\nhit=2&ua=test\nhit=3&cd1=cd1&ua=ua');
});

runner.test('exception hitParams', function () {});

runner.test('.defaults: extra params', function () {});

runner.test('methods taking maps as input also accept objects or map constructor data', function () {});

runner.test('_getOSVersion(): only cache for 24 hours', function () {});

runner.test('.enable()', function () {});
runner.test('.disable()', function () {});
runner.test('.exception()', function () {});
runner.test('.event(): as the first hit of a session - marked sc=start', function () {});