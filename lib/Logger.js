'use strict';
var config = require('./Configuration.js');

// The logger
const SimpleNodeLogger = require('simple-node-logger');
const opts = {
        logDirectory: 'logs',
		fileNamePattern: 'mattermost_cli_<DATE>.log',
		timestampFormat: 'YYYY-MM-DD HH:mm:ss.SSS'
	};
const log = SimpleNodeLogger.createSimpleLogger(opts);
log.setLevel(config.logLevel);

module.exports = {
    buildLog: function () {
        return log;
    }
}
