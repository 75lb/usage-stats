'use strict'
const Command = require('./command')
const UsageStats = require('../../../')
const commandLineUsage = require('command-line-usage')

class NoCommand extends Command {
  constructor (commandList) {
    super()
    this.commandList = commandList
  }
  optionDefinitions () {
    return [
      { name: 'help', type: Boolean, alias: 'h' }
    ]
  }
  usage () {
    return [
      { header: 'usage-stats'},
      {
        header: 'Options',
        content: this.commandList
          .filter(c => c.name !== null )
          .map(c => ({ name: c.name, desc: c.desc }))
      }
    ]
  }
  getData (options) {
    return Promise.resolve(commandLineUsage(this.usage()))
  }
}

module.exports = NoCommand
