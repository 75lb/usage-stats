'use strict';

var CliCommands = require('cli-commands');

var commandDefinitions = [{ name: 'screenview', desc: 'Track a screenview', command: require('./commands/screenview').create() }, { name: 'event', desc: 'Track an event', command: require('./commands/event').create() }, { name: null, desc: '' }];
commandDefinitions[2].command = require('./commands/no-command').create(commandDefinitions);

var cli = new CliCommands(commandDefinitions);