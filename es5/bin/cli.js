'use strict';

var cliData = require('../lib/cli-data');
var commandLineArgs = require('command-line-args');
var commandLineCommands = require('command-line-commands');
var commandLineUsage = require('command-line-usage');

var _commandLineCommands = commandLineCommands(cliData.commands);

var command = _commandLineCommands.command;
var argv = _commandLineCommands.argv;


console.log('hi');