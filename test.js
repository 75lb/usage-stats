'use strict'
var detect = require('feature-detect-es6')
var TestRunner = require('test-runner')

if (detect.all('class', 'arrowFunction', 'let', 'const')) {
  TestRunner.run('src/test/*.js')
} else {
  require('core-js/es6/object')
  TestRunner.run('es5/test/*.js')
}
