'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var request = require('req-then');
var url = require('url');
var reqOptions = url.parse('http://www.google-analytics.com/batch');
reqOptions.method = 'POST';

var UsageStats = function () {
  function UsageStats(options) {
    _classCallCheck(this, UsageStats);

    options = options || {};
    this.appName = options.appName;
    this.version = options.version;
    this._readClientId();
    var os = require('os');
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
    key: 'event',
    value: function event(category, action, label, value) {
      var t = require('typical');
      var form = Object.assign(this.defaults, {
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
      var form = Object.assign(this.defaults, {
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
      var payload = this.hits.join('\n');
      this.hits.length = 0;

      return request(reqOptions, payload);
    }
  }, {
    key: '_readClientId',
    value: function _readClientId() {
      if (!this.cid) {
        var os = require('os');
        var path = require('path');
        var fs = require('fs');
        var uuid = require('node-uuid');
        var tmpdir = path.resolve(os.tmpdir(), 'usage-stats');
        var cidPath = path.resolve(tmpdir, 'cid');
        try {
          this.cid = fs.readFileSync(cidPath, 'utf8');
        } catch (err) {
          if (err.code !== 'ENOENT') throw err;
          this.cid = uuid.v4();
          try {
            fs.mkdirSync(tmpdir);
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