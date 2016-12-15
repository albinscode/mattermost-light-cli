'use strict';

var Client = require('./Client.js');
var moment = require('moment');
var Promise = require('promise');
var client = new Client();
require('./ConsoleExtended.js');
var log = require('./Logger.js').buildLog();
var config = require('./Configuration.js');

// Sorry guys, but the official client does not take 3.5 server into account on npm published module.
//var Mattermost = require('mattermost');
//var client = new Mattermost.Client();

var teamProfiles = {};
var teamChannels = [];
var me = {};
var postCallback = null;
var wsUrl = null;

// Some denodified functions to avoid awfull callbacks
var authenticate = Promise.denodeify(client.login.bind(client));
var getAllTeamListings = Promise.denodeify(client.getAllTeamListings.bind(client));
var getChannels = Promise.denodeify(client.getChannels.bind(client));
var setActiveChannel = Promise.denodeify(client.setActiveChannel.bind(client));
var createPost = Promise.denodeify(client.createPost.bind(client));
var getPostsPage = Promise.denodeify(client.getPostsPage.bind(client));
var getProfilesInTeam = Promise.denodeify(client.getProfilesInTeam.bind(client));


const MAX_POSTS = 20;
const MAX_PROFILES = 200;
const RETRY_DELAY = 5000;

function connect(url, webserviceUrl, login, password) {
    client.url = url;
    // for debug purpose
    client.logToConsole = true;
    wsUrl = webserviceUrl;

    authenticate(
        login,
        password,
        '')
    // Get all teams
    .then(
        errorCallback,
        function success(user) {
            console.system('we are connected');
            console.system('Server version: ' + client.getServerVersion());
            console.system('Connected as %s', user.nickname);
            me = user;
            log.debug('Connected with ', JSON.stringify(me));
            client.useHeaderToken();
            return getAllTeamListings();
        }
    )
    // get linagora team
    .then(
        errorCallback,
        function success(teams) {
            // We get the linagora team
            var subTeam = Object.keys(teams).filter(function(key) {
                return teams[key].name === config.team;
            });
            if (subTeam.length > 0) {
                log.debug('Team id found is ', subTeam[0]);
                client.setTeamId(subTeam[0]);
            } else {
                reject('Linagora team not found!');
            }
            // we run in background the fetch of all profiles
            return getProfilesInTeam(client.getTeamId(), 0, MAX_PROFILES);
        }
    )
    .then(
        errorCallback,
        function success(profiles) {
            teamProfiles = profiles;
            log.debug('We try to get the channels');
            return getChannels();
        }
    )
    .then(
        errorCallback,
        function success(channels) {
            teamChannels = channels;
            runWebsocket();
            postCallback();
        }
    );
};

function setPostCallback(cb) {
    postCallback = cb;
}

/**
 * @param string channelId
 * @return the name of the associated channel
 */
function getChannelName(channelId) {
    var channel = '';
    teamChannels.forEach(function (item) {
        if (item.id === channelId) channel = item.name;
    });
    var parts = channel.split('__');
    // In case of private conversation, the channel name is converted
    // to the destination user (to be more readable).
    if (parts.length === 2) {
        if (teamProfiles[parts[0]] !== undefined) {
            channel = teamProfiles[parts[0]].username;
        }
    }
    return channel;
};

function getTeamChannels() {
    return teamChannels;
};

function getTeamProfiles() {
    return teamProfiles;
};


/**
 * @param integer channelId
 * Displays posts for given channel id
 */
function displayPosts(channelId) {
    getPostsPage(channelId, 0, MAX_POSTS)
    .then(
        errorCallback,
        function (posts) {
            posts.order.reverse().forEach(function (postId) {
                printPost(posts.posts[postId]);
            });
            postCallback();
        }
    );
};


// TODO we have to do a search with user nickname or username
function getRelatedPosts() {
    client.getFlaggedPosts(
        0,
        MAX_POSTS,
        function success(posts) {
            log.debug('flagged posts are ', JSON.stringify(posts));
            postCallback();
        },
        errorCallback
    );
};

function getMe() {
    return me;
}

/**
 * @param string message
 * @param string channel identifier
 * Create a new post in the current joind channel.
 */
function writeMessage(message, channelId) {
    var mypost = {
        message: message,
        channel_id: channelId,
        user_id : me.user_id
    }
    createPost(mypost);
    postCallback();
}

// ------- PRIVATE FUNCTIONS

/**
 * The api was too buggy and the websocket was easy to set up from scratch.
 */
function runWebsocket () {
    var WebSocketClient = require('websocket').client;

    var wsClient = new WebSocketClient();

    wsClient.on('connectFailed', function(error) {
        console.error('Connect Error: ' + error.toString());
    });

    wsClient.on('connect', function(connection) {
        console.system('Listening for live events...');
        connection.on('error', function(error) {
            console.error("Connection Error: " + error.toString());
        });
        connection.on('close', function() {
            console.error('Connection Closed');
            // We retry a connection
            setTimeout(runWebsocket, RETRY_DELAY);
        });
        connection.on('message', function(message) {
            if (message.type === 'utf8') {
                manageMessage(message.utf8Data);
            }
        });

        function sendAuth() {
            if (connection.connected) {
                var data =
                    {
                        "seq": 1,
                        "action": "authentication_challenge",
                        "data": {
                            "token": client.token
                        }
                    }
                connection.sendUTF(JSON.stringify(data));
            }
        }
        sendAuth();
    });

    wsClient.connect(wsUrl, '', '');
}

/**
 * Handles the message from the websocket service.
 * @param string message an utf8 message
 */
function manageMessage(message) {

    message = JSON.parse(message);
    switch (message.event) {
        case undefined:
            console.alert('undefined event...');
            break;
        case 'status_change':
            console.alert('%s is now %s', getUserInfos(message.data.user_id), message.data.status);
            break;
        case 'hello':
            console.alert('%s is connecting', getUserInfos(message.broadcast.user_id));
            break;
        case 'posted':
            printPost(JSON.parse(message.data.post));
            break;
        case 'typing':
            console.alert('%s is typing', getUserInfos(message.data.user_id));
            break;
        default:
            console.alert('other type of event %s, %s', message.event, JSON.stringify(message));
            break;
    }
    postCallback();
}

/**
 * @param string userId the user id
 * @return a string describing the user more human friendly
 */
function getUserInfos(userId) {
    var result = 'unknown user';
    if (teamProfiles[userId]) {
        result = teamProfiles[userId].nickname + ' (' + teamProfiles[userId].username + ')';
    }
    return result;
}

/**
 * @param object post
 * Displays given post to the console.
 **/
function printPost(post) {

    var date = moment(post.create_at).format('DD/MM/YYYY, HH:mm');
    var channelName = getChannelName(post.channel_id);
    var userInfos = getUserInfos(post.user_id);
    console.check(me.id === post.user_id, '#%s [%s] %s: %s', channelName, date, userInfos, post.message);
    postCallback();
}

// Default error callback
function errorCallback(e) {
    console.error('error');
    console.error(JSON.stringify(e));
}

// We're making a late binding to allow exposed and not exposed functions to communicate each other.
module.exports = {
    connect,
    displayPosts,
    getChannelName,
    getTeamChannels,
    getTeamProfiles,
    getMe,
    writeMessage,
    setPostCallback
}
