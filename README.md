Presentation
===

This is a command line interface to chat with mattermost.

Prerequisites
===

Node 7 shall be installed.

Installation
===

`npm install`

The create your config file with `cp config.json.sample config.json`

Edit the file config.json with your team and credentials.

Then run the application with `node index.js`

Use
===

This is like an IRC client but with limited supported commands (see `help`).

By default you will be notified of all events happening on the team so it can be very verbose ;).


Links
===

To see if it is easy to create a mattermost console client.

See links:

* the web api: https://docs.mattermost.com/developer/web-service.html
* a react api: https://github.com/mattermost/platform/blob/master/webapp/client/client.jsx
* apparently it uses https://github.com/visionmedia/superagent
* websocket example to listen for events: https://github.com/mattermost/mattermost-bot-sample-golang
