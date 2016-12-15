'use strict';
var Promise = require('promise');
var inquirer = require('inquirer');
var moment = require('moment');
var colors = require('colors');
var Service = require('./lib/Service.js');
var vorpal = require('vorpal')();

// console redefinitions
require('./lib/ConsoleExtended.js');
var log = require('./lib/Logger.js').buildLog();
var config = require('./lib/Configuration.js');

var currentChannelId = null;

var service = Service;

function updateDelimiter() {
    vorpal.delimiter(service.getMe().username + '@' + service.getChannelName(currentChannelId) + ':');
    return vorpal;
}

function getChannelNames() {
    var chans = service.getTeamChannels().map(function (item) {  return service.getChannelName(item.id); });
    return chans;
}

// The actions to run after the connection
service.setPostCallback(function() {
    // we run the CLI
    updateDelimiter().show();
})

service.connect(config.url, config.wsUrl, config.login, config.password);

vorpal.command('/refresh', 'to refresh posts of the current connected channel')
    .action(function (args, callback) {
        if (currentChannelId) {
            service.setPostCallback(callback);
            service.displayPosts(currentChannelId);
        } else {
            console.error('You are not connected to any channel... Please user /join command');
            callback();
        }
    });

vorpal.command('/join <channel>', 'to join a specific channel given its name (see /list command)')
    .autocomplete(getChannelNames)
    .action(function (args, callback) {
        var found = service.getTeamChannels().filter(function (item) {
            return item.name === args.channel;
        });
        if (found.length == 1) {
            currentChannelId = found[0].id;
            service.setPostCallback(callback);
            service.displayPosts(currentChannelId);
            updateDelimiter();
        } else {
            console.error('invalid channel name');
            callback();
        }
    });

vorpal.command('/msg <username>', 'to join a specific private conversation with a user (see /list command)')
    .autocomplete(getChannelNames)
    .action(function (args, callback) {
        var users = Object.keys(service.getTeamProfiles()).filter(function (key) {
            return service.getTeamProfiles()[key].username === args.username;
        });
        if (users.length == 0) {
            console.error('User %s does not exist', args.username);
            callback();
            return;
        }
        var channelName = `${users[0]}__${service.getMe()['id']}`;
        var found = service.getTeamChannels().filter(function (item) {
            return item.name === channelName;
        });
        log.debug('Found destination user is ', JSON.stringify(users[0]));
        log.debug('Built private channel ', channelName);
        currentChannelId = found[0].id;
        service.setPostCallback(callback);
        service.displayPosts(currentChannelId);
        updateDelimiter();
    });

vorpal.command('/list', 'to list available channels and already existing private conversations')
    .action(function (args, callback) {
        console.system('Channels list');
        service.getTeamChannels().forEach(function (item) {
            console.info('Channel %s is available', service.getChannelName(item.id));
        });
        callback();
    });

vorpal.command('/quit', 'to... quit :)')
    .action(function (args, callback) {
        console.info('Good bye!');
        process.exit(0);
    });

vorpal.command('/related', 'show all posts related to you')
    .action(function (args, callback) {
        callback();
    });

vorpal.command('/write [message...]', 'to write a message on the current channel/private conversation')
    .action(function (args, callback) {
        if (currentChannelId !== null) {
            service.setPostCallback(callback);
            // The message is a variadic, so an array is provided, we have to join it
            service.writeMessage(args.message.join(' '), currentChannelId);
        } else {
            console.error('Cannot send your message, void or no channel set.');
            callback();
        }
    });


