'use strict'
const Command = require('./command')
const UsageStats = require('../../../')

class ScreenView extends Command {
  optionDefinitions () {
    return super.optionDefinitions().concat([
      { name: 'cd', type:String }
    ])
  }
  getData (options) {
    super.getData(options)
    options = options || {}
    if (!options.cd) throw new Error('cd required')
    const usage = new UsageStats(options.tid, options)
    const hit = usage.screenView(options.cd, options)
    if (options.debug) {
      return usage.debug()
    } else {
      return usage.send()
    }
  }
}

module.exports = ScreenView
