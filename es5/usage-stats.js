'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var path = require('path');
var os = require('os');
var fs = require('fs');

var UsageStats = function () {
  function UsageStats(trackingId, options) {
    _classCallCheck(this, UsageStats);

    if (!trackingId) throw new Error('a Google Analytics TrackingID is required');
    options = options || {};

    this._dir = path.resolve(os.tmpdir(), 'usage-stats');

    try {
      fs.mkdirSync(this._dir);
    } catch (err) {}

    this._queuePath = path.resolve(this._dir, 'queue.json');
    this._disabled = false;
    this._hits = [];
    this._defaults = {
      v: 1,
      tid: trackingId,
      ds: 'app',
      cid: this._getClientId(),
      ul: options.lang || process.env.LANG,
      sr: options.sr || this._getScreenResolution(),
      an: options.appName || '',
      av: options.version || '',
      aid: process.version,
      aiid: os.type() + '; ' + os.release()
    };
  }

  _createClass(UsageStats, [{
    key: 'start',
    value: function start() {
      if (this._disabled) return this;
      this._sessionStarted = true;
      return this;
    }
  }, {
    key: 'end',
    value: function end() {
      if (this._disabled) return this;
      this._hits[this._hits.length - 1] += '&sc=end';
      return this;
    }
  }, {
    key: 'disable',
    value: function disable() {
      this._disabled = true;
      return this;
    }
  }, {
    key: 'enable',
    value: function enable() {
      this._disabled = false;
      return this;
    }
  }, {
    key: 'event',
    value: function event(category, action, label, value) {
      if (this._disabled) return this;
      if (!(category && action)) throw new Error('category and action required');
      var t = require('typical');
      var form = Object.assign({}, this._defaults, {
        t: 'event',
        ec: category,
        ea: action
      });
      if (this._sessionStarted) {
        form.sc = 'start';
        this._sessionStarted = false;
      }
      if (t.isDefined(label)) form.el = label;
      if (t.isDefined(value)) form.ev = value;
      this._hits.push(postData(form));
      return this;
    }
  }, {
    key: 'screenView',
    value: function screenView(name) {
      if (this._disabled) return this;
      var form = Object.assign({}, this._defaults, {
        t: 'screenview',
        cd: name
      });
      if (this._sessionStarted) {
        form.sc = 'start';
        this._sessionStarted = false;
      }
      this._hits.push(postData(form));
      return this;
    }
  }, {
    key: 'exception',
    value: function exception(description, isFatal) {
      if (this._disabled) return this;
      var form = Object.assign({}, this._defaults, {
        t: 'exception',
        exd: description,
        exf: isFatal ? 1 : 0
      });
      this._hits.push(postData(form));
      return this;
    }
  }, {
    key: 'send',
    value: function send(options) {
      var _this = this;

      if (this._disabled) return this;
      options = options || {};
      var queued = this._getQueued();
      var lines = queued ? queued.trim().split(os.EOL).concat(this._hits) : this._hits.slice(0);
      this._hits.length = 0;

      var url = require('url');
      var requests = [];
      if (options.debug) {
        var reqOptions = url.parse('https://www.google-analytics.com/debug/collect');
        reqOptions.method = 'POST';
        var hits = lines.join(os.EOL) + os.EOL;
        return this._request(reqOptions, hits).then(function (response) {
          var output = {
            hits: lines,
            result: JSON.parse(response.data.toString())
          };
          return JSON.stringify(output, null, '  ');
        }).catch(function (err) {
          if (err.code === 'ENOENT') {
            return {
              hits: lines,
              result: '<offline>'
            };
          } else {
            throw err;
          }
        });
      } else {
        var _loop = function _loop() {
          var batchLines = lines.splice(0, 20);
          var reqOptions = url.parse('http://www.google-analytics.com/batch');
          reqOptions.method = 'POST';
          var req = _this._request(reqOptions, batchLines.join(os.EOL) + os.EOL).then(function (response) {
            if (response.res.statusCode >= 300) {
              throw new Error('Unexpected response');
            } else {
              return response;
            }
          }).catch(function (err) {
            _this._enqueue(batchLines);
          });
          requests.push(req);
        };

        while (lines.length) {
          _loop();
        }
        return Promise.all(requests);
      }
    }
  }, {
    key: '_getClientId',
    value: function _getClientId() {
      var cid = null;
      var uuid = require('node-uuid');
      var cidPath = path.resolve(this._dir, 'cid');
      try {
        cid = fs.readFileSync(cidPath, 'utf8');
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
        cid = uuid.v4();
        fs.writeFileSync(cidPath, cid);
      }
      return cid;
    }
  }, {
    key: '_request',
    value: function _request(reqOptions) {
      var request = require('req-then');
      return request(reqOptions);
    }
  }, {
    key: '_dequeue',
    value: function _dequeue(count) {
      try {
        var queue = fs.readFileSync(this._queuePath, 'utf8');
        var hits = queue.trim().split(os.EOL);
        var output = hits.splice(0, count);
        fs.writeFileSync(this._queuePath, arrayToLines(hits));
        return arrayToLines(output);
      } catch (err) {
        if (err.code === 'ENOENT') {
          return '';
        } else {
          throw err;
        }
      }
    }
  }, {
    key: '_enqueue',
    value: function _enqueue(hits) {
      fs.appendFileSync(this._queuePath, arrayToLines(hits));
    }
  }, {
    key: '_getScreenResolution',
    value: function _getScreenResolution() {
      return process.stdout.rows && process.stdout.columns ? process.stdout.rows + 'x' + process.stdout.columns : 'N/A';
    }
  }]);

  return UsageStats;
}();

function postData(form) {
  return Object.keys(form).map(function (key) {
    return key + '=' + encodeURI(form[key]);
  }).join('&');
}

function arrayToLines(array) {
  var output = array.join(os.EOL);
  if (output) output += os.EOL;
  return output;
}

module.exports = UsageStats;