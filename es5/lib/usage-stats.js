'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var path = require('path');
var os = require('os');
var fs = require('fs');
var arrayify = require('array-back');

var UsageStats = function () {
  function UsageStats(trackingId, options) {
    _classCallCheck(this, UsageStats);

    if (!trackingId) throw new Error('a Google Analytics TrackingID is required');
    options = options || {};

    var homePath = require('home-path');

    this.dir = options.dir || path.resolve(homePath(), '.usage-stats');

    this._queuePath = path.resolve(this.dir, 'queue');
    this._disabled = false;
    this._hits = [];

    this._url = {
      debug: options.debugUrl || 'https://www.google-analytics.com/debug/collect',
      batch: options.url || 'https://www.google-analytics.com/batch'
    };

    this.defaults = new Map([['v', 1], ['tid', trackingId], ['ds', 'app'], ['cid', this._getClientId()], ['ua', options.ua || 'Mozilla/5.0 ' + this._getOSVersion() + ' Node/' + process.version], ['ul', options.lang || process.env.LANG], ['sr', options.sr || this._getScreenResolution()], ['an', options.name || ''], ['av', options.version || '']]);

    this._requestController = {};
  }

  _createClass(UsageStats, [{
    key: 'start',
    value: function start(sessionParams) {
      if (this._disabled) return this;
      this._sessionStarted = true;
      if (sessionParams) this._sessionParams = sessionParams;
      return this;
    }
  }, {
    key: 'end',
    value: function end() {
      if (this._disabled) return this;
      if (this._hits.length === 1) {
        this._hits[0].set('sc', 'end');
      } else if (this._hits.length > 1) {
        this._hits[this._hits.length - 1].set('sc', 'end');
      }
      if (this._sessionParams) delete this._sessionParams;
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
    key: '_createHit',
    value: function _createHit(map) {
      if (map && !(map instanceof Map)) throw new Error('map instance required');
      return new Map([].concat(_toConsumableArray(this.defaults), _toConsumableArray(map)));
    }
  }, {
    key: 'event',
    value: function event(category, action, options) {
      if (this._disabled) return this;
      options = options || {};
      if (!(category && action)) throw new Error('category and action required');

      var hit = this._createHit(new Map([['t', 'event'], ['ec', category], ['ea', action]]));
      if (options.hitParams) hit = new Map([].concat(_toConsumableArray(hit), _toConsumableArray(options.hitParams)));
      if (this._sessionParams) hit = new Map([].concat(_toConsumableArray(hit), _toConsumableArray(this._sessionParams)));
      if (this._sessionStarted) {
        hit.set('sc', 'start');
        this._sessionStarted = false;
      }

      var t = require('typical');
      if (t.isDefined(options.label)) hit.set('el', options.label);
      if (t.isDefined(options.value)) hit.set('ev', options.value);
      this._hits.push(hit);
      return this;
    }
  }, {
    key: 'screenView',
    value: function screenView(name, options) {
      if (this._disabled) return this;
      options = options || {};
      if (options.hitParams && !(options.hitParams instanceof Map)) throw new Error('map instance required');

      var hit = this._createHit(new Map([['t', 'screenview'], ['cd', name]]));
      if (options.hitParams) hit = new Map([].concat(_toConsumableArray(hit), _toConsumableArray(options.hitParams)));
      if (this._sessionParams) hit = new Map([].concat(_toConsumableArray(hit), _toConsumableArray(this._sessionParams)));
      if (this._sessionStarted) {
        hit.set('sc', 'start');
        this._sessionStarted = false;
      }
      this._hits.push(hit);
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

      if (this._disabled) return Promise.resolve([]);
      options = options || {};

      var toSend = this._dequeue().concat(this._hits);
      this._hits.length = 0;

      var url = require('url');
      var reqOptions = url.parse(options.debug ? this._url.debug : this._url.batch);
      reqOptions.method = 'POST';
      reqOptions.headers = {
        'content-type': 'text/plain'
      };
      reqOptions.controller = this._requestController;

      var requests = [];
      if (options.debug) {
        var _loop = function _loop() {
          var batch = toSend.splice(0, 20);
          var req = _this._request(reqOptions, _this._createHitsPayload(batch)).then(validGAResponse).then(function (response) {
            return {
              hits: batch,
              result: JSON.parse(response.data.toString())
            };
          }).catch(function (err) {
            return {
              hits: batch,
              err: err
            };
          });
          requests.push(req);
        };

        while (toSend.length && !this._aborted) {
          _loop();
        }
        return Promise.all(requests);
      } else {
        var _loop2 = function _loop2() {
          var batch = toSend.splice(0, 20);
          var req = _this._request(reqOptions, _this._createHitsPayload(batch)).then(validGAResponse).catch(function (err) {
            batch = batch.map(function (hit) {
              if (err.name === 'aborted') hit.set('cd4', true);

              hit.set('cd5', true);
              return hit;
            });
            _this._enqueue(batch);
            return {
              err: err
            };
          });
          requests.push(req);
        };

        while (toSend.length && !this._aborted) {
          _loop2();
        }
        return Promise.all(requests).then(function (results) {
          if (_this._aborted) {
            toSend = toSend.map(function (hit) {
              hit.set('cd5', true);
              return hit;
            });
            _this._enqueue(toSend);
            _this._aborted = false;
          }
          return results;
        });
      }
    }
  }, {
    key: 'abort',
    value: function abort() {
      if (this._disabled) return this;
      if (this._requestController && this._requestController.abort) {
        this._aborted = true;
        this._requestController.abort();
      }
      return this;
    }
  }, {
    key: '_getClientId',
    value: function _getClientId() {
      var cid = null;
      var uuid = require('node-uuid');
      var cidPath = path.resolve(this.dir, 'cid');
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
    key: '_getOSVersion',
    value: function _getOSVersion() {
      var output = null;
      var osVersionPath = path.resolve(this.dir, 'osversion');
      try {
        output = fs.readFileSync(osVersionPath, 'utf8');
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
        var execSync = require('child_process').execSync;
        if (!execSync) {
          output = 'N/A';
        } else {
          if (os.platform() === 'win32') {
            output = '(Windows NT ' + os.release() + ')';
          } else if (os.platform() === 'darwin') {
            output = '(Macintosh; Intel MAC OS X ' + execSync('sw_vers -productVersion').toString().trim() + '; Node ' + process.version + ')';
          } else if (os.platform() === 'linux') {
            output = '(X11; Linux ' + os.release() + ')';
          }
        }
        fs.writeFileSync(osVersionPath, output);
      }
      return output;
    }
  }, {
    key: '_request',
    value: function _request(reqOptions, data) {
      var request = require('req-then');
      return request(reqOptions, data);
    }
  }, {
    key: '_dequeue',
    value: function _dequeue(count) {
      try {
        var queue = fs.readFileSync(this._queuePath, 'utf8');
        var hits = jsonToHits(queue);
        var output = [];
        if (count) {
          output = hits.splice(0, count);
          fs.writeFileSync(this._queuePath, hitsToJson(hits));
        } else {
          fs.writeFileSync(this._queuePath, '');
          output = hits;
        }
        return output;
      } catch (err) {
        if (err.code === 'ENOENT') {
          return [];
        } else {
          throw err;
        }
      }
    }
  }, {
    key: '_enqueue',
    value: function _enqueue(hits) {
      hits = arrayify(hits);
      if (hits.length) {
        hits = hits.map(function (hit) {
          if (hit.has('sc')) hit.delete('sc');
          return hit;
        });
        fs.appendFileSync(this._queuePath, hitsToJson(hits));
      }
      return this;
    }
  }, {
    key: '_getScreenResolution',
    value: function _getScreenResolution() {
      return process.stdout.columns && process.stdout.rows ? process.stdout.columns + 'x' + process.stdout.rows : 'N/A';
    }
  }, {
    key: '_createHitsPayload',
    value: function _createHitsPayload(hits) {
      return arrayify(hits).map(function (hit) {
        return Array.from(hit).map(function (_ref) {
          var _ref2 = _slicedToArray(_ref, 2);

          var key = _ref2[0];
          var value = _ref2[1];
          return key + '=' + encodeURIComponent(value);
        }).join('&');
      }).join(os.EOL);
    }
  }, {
    key: 'dir',
    get: function get() {
      return this._dir;
    },
    set: function set(val) {
      this._dir = val;
      var mkdirp = require('mkdirp');
      mkdirp.sync(this._dir);
    }
  }]);

  return UsageStats;
}();

function hitsToJson(hits) {
  return arrayify(hits).map(function (hit) {
    return mapToJson(hit) + os.EOL;
  }).join('');
}

function jsonToHits(json) {
  if (json) {
    var hits = json.trim().split(os.EOL);
    return hits.map(function (hitJson) {
      return jsonToMap(hitJson);
    });
  } else {
    return [];
  }
}

function validGAResponse(response) {
  if (response.res.statusCode >= 300) {
    throw new Error('Unexpected response');
  } else {
    return response;
  }
}

function mapToJson(map) {
  return JSON.stringify([].concat(_toConsumableArray(map)));
}
function jsonToMap(json) {
  return new Map(JSON.parse(json));
}

module.exports = UsageStats;