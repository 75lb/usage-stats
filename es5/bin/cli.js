'use strict';

var commandLineArgs = require('command-line-args');
var commandLineCommands = require('command-line-commands');
var commandLineUsage = require('command-line-usage');
var t = require('typical');

var commandList = [{ name: 'screenview', desc: 'Track a screenview', command: './commands/screenview' }, { name: 'event', desc: 'Track an event', command: './commands/event' }, { name: null, desc: '' }];
commandList[2].command = require('./commands/no-command').create(commandList);

var _commandLineCommands = commandLineCommands(commandList.map(function (c) {
  return c.name;
}));

var commandName = _commandLineCommands.command;
var argv = _commandLineCommands.argv;


var cmd = commandList.find(function (c) {
  return c.name === commandName;
}).command;
var command = typeof cmd === 'string' ? require(cmd).create() : cmd;

var options = commandLineArgs(command.optionDefinitions());
var usageSections = command.usage();

if (options.help) {
  console.log(commandLineUsage(usageSections));
} else {
  var result = command.getData(options);
  if (result.then) {
    result.then(function (output) {
      if (t.isString(output)) {
        console.log(output);
      } else {
        console.error(require('util').inspect(output, { depth: 13, colors: true }));
      }
    });
  } else {
    console.log(result);
  }
}