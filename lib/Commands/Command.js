var path = require('path');
var fs = require('fs');
var ParameterBag = require('../ParameterBag');
var Account = require('../Account');
var DB = require('../Cache/MySQL');
var Node = require('../Node');
var Utils = require('../Utils');
var colors = require('colors');
var moment = require('moment');
var elegantSpinner = require('elegant-spinner');
var logUpdate = require('log-update');

function Command(config) {
    var defaultConfig = {
        offline: false
    };

    if (config === undefined) {
        config = {};
    }

    for (var key in config) {
        if (defaultConfig[key] === undefined) {
            continue;
        }

        defaultConfig[key] = config[key];
    }
}

Command.prototype.execute = function (cmd, options) {
    var self = this;
    var args = arguments;
    this.initialize(function () {
        self.account.load(function () {
            self.run.apply(self, args)
                .then(function (code) {
                    self.shutdown(code);
                });
        });
    });
};

Command.prototype.getConfigPath = function () {
    return path.resolve(Utils.getHomeDirectory() + '/.cache/clouddrive-node/config.json')
};

Command.prototype.initialize = function (callback) {
    this.readConfig();

    var self = this;
    var cache = new DB({
        client: 'mysql',
        connection: {
            host     : '127.0.0.1',
            user     : 'root',
            password : '',
            database : 'clouddrive'
        }
    }, function (err, cache) {
        self.account = new Account(self.config.get('email'), self.config.get('client-id'), self.config.get('client-secret'), cache);
        Node.init(self.account, cache);
        callback(null);
    });
};

Command.prototype.list = function (nodes) {
    nodes.sort(function (a, b) {
        if (a.getName().toLowerCase() < b.getName().toLowerCase()) {
            return -1;
        }
        if (a.getName().toLowerCase() > b.getName().toLowerCase()) {
            return 1;
        }

        return 0;
    });

    for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];

        var now = new Date();
        var modified = new Date(node.get('modifiedDate'));
        var date = moment(modified).format('MMM DD YY');
        if (now.getYear() === modified.getYear()) {
            date = moment(modified).format('MMM DD HH:mm');
        }

        var name = node.isFolder() ? node.getName().blue : node.getName();
        var size = Utils.convertFileSize(node.get('contentProperties.size'));

        console.log("%s  %s  %s %s %s %s", node.get('id'), date, Utils.pad(node.get('status'), 10), Utils.pad(node.get('kind'), 7), Utils.pad(size, 9), name);
    }
};

Command.prototype.readConfig = function () {
    var defaultConfig = {
        "email": {
            "type": "string",
            "default": ""
        },
        "client-id": {
            "type": "string",
            "default": ""
        },
        "client-secret": {
            "type": "string",
            "default": ""
        },
        "json.pretty": {
            "type": "bool",
            "default": false
        },
        "upload.duplicates": {
            "type": "bool",
            "default": false
        },
        "display.trash": {
            "type": "bool",
            "default": false
        }
    };

    this.config = new ParameterBag();
    for (var key in defaultConfig) {
        this.config.set(key, defaultConfig[key].default);
    }

    var configPath = this.getConfigPath();
    if (fs.existsSync(configPath)) {
        var savedConfig = new ParameterBag(JSON.parse(fs.readFileSync(configPath))).flatten();
        for (var i in savedConfig) {
            if (defaultConfig[i] === undefined) {
                continue;
            }

            switch (defaultConfig[i].type) {
                case "bool":
                    var value = savedConfig[i] === "true" ? true : false;
                    this.config.set(i, value);
                    break;
                default:
                    this.config.set(i, savedConfig[i]);
                    break;
            }
        }
    }
};

Command.prototype.run = function (cmd, options) {

};

Command.prototype.saveConfig = function () {
    fs.writeFileSync(this.getConfigPath(), JSON.stringify(this.config.getData()));
};

Command.prototype.shutdown = function (code) {
    if (code === undefined) {
        code = 0;
    }

    process.exit(code);
};

var spinner = null;

Command.startSpinner = function (message) {
    if (message === undefined) {
        message = '';
    }

    var frame = elegantSpinner();
    spinner = setInterval(function () {
        logUpdate(message + frame().cyan);
    }, 50);
};

Command.stopSpinner = function (message) {
    if (message === undefined) {
        message = '';
    }

    clearInterval(spinner);
    logUpdate(message);
};

module.exports = Command;
