'use strict'
const commandLineArgs = require('command-line-args')
const commandLineCommands = require('command-line-commands')
const commandLineUsage = require('command-line-usage')
const t = require('typical')

const commandList = [
  { name: 'screenview', desc: 'Track a screenview', command: './commands/screenview' },
  { name: 'event', desc: 'Track an event', command: './commands/event' },
  { name: null, desc: '' }
]
commandList[2].command = require('./commands/no-command').create(commandList)

const { command: commandName, argv } = commandLineCommands(commandList.map(c => c.name))

const cmd = commandList.find(c => c.name === commandName).command
const command = typeof cmd === 'string' ? require(cmd).create() : cmd

const options = commandLineArgs(command.optionDefinitions())
const usageSections = command.usage()

if (options.help) {
  console.log(commandLineUsage(usageSections))
} else {
  const result = command.getData(options)
  if (result.then) {
    result.then(output => {
      if (t.isString(output)) {
        console.log(output)
      } else {
        console.error(require('util').inspect(output, { depth: 13, colors: true }))
      }
    })
  } else {
    console.log(result)
  }
}
