'use strict'
const cliData = require('../lib/cli-data')
const commandLineArgs = require('command-line-args')
const commandLineCommands = require('command-line-commands')
const commandLineUsage = require('command-line-usage')

const { command, argv } = commandLineCommands(cliData.commands)

console.log('hi')
