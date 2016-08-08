'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var request = require('req-then');
var url = require('url');
var path = require('path');
var os = require('os');
var fs = require('fs');
var reqOptions = url.parse('http://www.google-analytics.com/batch');
reqOptions.method = 'POST';

var UsageStats = function () {
  function UsageStats(options) {
    _classCallCheck(this, UsageStats);

    options = options || {};
    this.tmpdir = path.resolve(os.tmpdir(), 'usage-stats');
    this.queuePath = path.resolve(this.tmpdir, 'queue');
    this.appName = options.appName;
    this.version = options.version;
    this._readClientId();
    this.defaults = {
      v: 1,
      tid: options.tid,
      cid: this.cid,
      ds: 'app',
      ul: process.env.LANG,
      ua: 'jsdoc2md/' + options.version + ' (' + os.type() + '; ' + os.release() + ')',
      sr: process.stdout.rows + 'x' + process.stdout.columns
    };
    this.hits = [];
  }

  _createClass(UsageStats, [{
    key: 'start',
    value: function start() {
      this.hits.push({ sc: 'start' });
      return this;
    }
  }, {
    key: 'end',
    value: function end() {
      this.hits.push({ sc: 'end' });
      return this;
    }
  }, {
    key: 'event',
    value: function event(category, action, label, value) {
      var t = require('typical');
      var form = Object.assign({}, this.defaults, {
        t: 'event',
        ec: category,
        ea: action
      });
      if (t.isDefined(label)) form.el = label;
      if (t.isDefined(value)) form.ev = value;
      this.hits.push(postData(form));
      return this;
    }
  }, {
    key: 'screenView',
    value: function screenView(name) {
      var form = Object.assign({}, this.defaults, {
        t: 'screenview',
        an: this.appName,
        av: this.version,
        aid: process.version,
        cd: name
      });
      this.hits.push(postData(form));
      return this;
    }
  }, {
    key: 'send',
    value: function send() {
      var _this = this;

      var queued = '';
      try {
        queued = fs.readFileSync(this.queuePath, 'utf8');
        fs.unlinkSync(this.queuePath);
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
      }
      var lines = queued ? queued.trim().split('\n').concat(this.hits) : this.hits.slice(0);
      this.hits.length = 0;

      var _loop = function _loop() {
        var batch = lines.splice(0, 5).join('\n') + '\n';
        request(reqOptions, batch).catch(function (err) {
          try {
            fs.appendFileSync(_this.queuePath, batch);
          } catch (err) {
            if (err.code !== 'ENOENT') throw err;
            try {
              fs.mkdirSync(_this.tmpdir);
            } catch (err) {}
            fs.appendFileSync(_this.queuePath, batch);
          }
        });
      };

      while (lines.length) {
        _loop();
      }
      return this;
    }
  }, {
    key: '_readClientId',
    value: function _readClientId() {
      if (!this.cid) {
        var uuid = require('node-uuid');
        var cidPath = path.resolve(this.tmpdir, 'cid');
        try {
          this.cid = fs.readFileSync(cidPath, 'utf8');
        } catch (err) {
          if (err.code !== 'ENOENT') throw err;
          this.cid = uuid.v4();
          try {
            fs.mkdirSync(this.tmpdir);
          } catch (err) {}
          fs.writeFileSync(cidPath, this.cid);
        }
      }
    }
  }]);

  return UsageStats;
}();

function postData(form) {
  return Object.keys(form).map(function (key) {
    return key + '=' + form[key];
  }).join('&');
}

module.exports = UsageStats;