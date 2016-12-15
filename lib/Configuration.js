var fs = require('fs');

// The object to return
var config = null;

try {
    var content = fs.readFileSync('./config.json', 'utf-8');
    config = JSON.parse(content);
} catch (e) {
    throw 'You must correctly set your config.json: ' + e;
}

module.exports = config;
