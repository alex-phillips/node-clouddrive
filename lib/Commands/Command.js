var path = require('path');
var fs = require('fs');
var ParameterBag = require('../ParameterBag');
var Account = require('../Account');
var Node = require('../Node');
var Utils = require('../Utils');
var colors = require('colors');
var moment = require('moment');
var elegantSpinner = require('elegant-spinner');
var Promise = require('promise');

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

    this.params = defaultConfig;
}

Command.SORT_BY_NAME = 'name';
Command.SORT_BY_DATE = 'date';

Command.prototype.execute = function (cmd, options) {
    var self = this;
    self.readConfig();
    self.run.apply(self, arguments)
        .then(function (code) {
            self.shutdown(code);
        });
};

Command.prototype.getCacheDirectory = function () {
    return (Utils.getHomeDirectory() || Utils.getTmpDirectory()) + "/.cache/clouddrive-node";
};

Command.prototype.getConfigPath = function () {
    var cacheDir = this.getCacheDirectory() + "/config.json";
    return path.resolve(cacheDir)
};

Command.prototype.initialize = function (callback) {
    var self = this;
    return Promise.denodeify(self.initializeDatabase).call(self)
        .then(function () {
            if (self.params.offline === false) {
                return Promise.denodeify(self.account.authorize).call(self.account, null)
                    .then(function (data) {
                        if (data.success === true) {
                            return callback();
                        } else {
                            console.log("Account not authorized with Amazon's Cloud Drive. Run `init` command first.".red);

                            return 1;
                        }
                    }, function (err) {
                        console.log(err.message.red);

                        return 1;
                    });
            }

            return callback();
        });
};

Command.prototype.initializeDatabase = function (callback) {
    var self = this;
    switch (this.config.get('database.driver')) {
        case "sqlite":
            var SQLite = require('../Cache/SQLite3');
            new SQLite({
                client: 'sqlite3',
                connection: {
                    filename: self.getCacheDirectory() + "/" + self.config.get('email') + ".db"
                }
            }, function (err, cache) {
                self.account = new Account(self.config.get('email'), self.config.get('client-id'), self.config.get('client-secret'), cache);
                Node.init(self.account, cache);
                callback(null);
            });
            break;
        case "mysql":
            var MySQL = require('../Cache/MySQL');
            new MySQL({
                client: 'mysql',
                connection: {
                    host     : self.config.get('database.host'),
                    user     : self.config.get('database.username'),
                    password : self.config.get('database.password'),
                    database : self.config.get('database.database')
                }
            }, function (err, cache) {
                self.account = new Account(self.config.get('email'), self.config.get('client-id'), self.config.get('client-secret'), cache);
                Node.init(self.account, cache);
                callback(null);
            });
            break;
        case "mongo":
            var Mongo = require('../Cache/Mongo');
            new Mongo({}, function (err, cache) {
                self.account = new Account(self.config.get('email'), self.config.get('client-id'), self.config.get('client-secret'), cache);
                Node.init(self.account, cache);
                callback(null);
            });
            break;
    }
};

Command.prototype.list = function (nodes, sortOrder) {
    switch (sortOrder) {
        case Command.SORT_BY_DATE:
            nodes.sort(function (a, b) {
                if (a.getModifiedDate() < b.getModifiedDate()) {
                    return -1;
                }
                if (a.getModifiedDate() > b.getModifiedDate()) {
                    return 1;
                }

                return 0;
            });
            break;
        case Command.SORT_BY_NAME:
        default:
            nodes.sort(function (a, b) {
                if (a.getName().toLowerCase() < b.getName().toLowerCase()) {
                    return -1;
                }
                if (a.getName().toLowerCase() > b.getName().toLowerCase()) {
                    return 1;
                }

                return 0;
            });
            break;
    }

    for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];

        var now = new Date();
        var modified = new Date(node.get('modifiedDate'));
        var date = moment(modified).format('MMM DD YY');
        if (now.getYear() === modified.getYear()) {
            date = moment(modified).format('MMM DD HH:mm');
        }

        var name = node.isFolder() ? node.getName().blue : node.getName();
        var size = Utils.convertFileSize(node.getSize(), 0);

        console.log("%s  %s  %s %s %s %s", node.get('id'), date, Utils.pad(node.get('status'), 10), Utils.pad(node.get('kind'), 7), Utils.pad(size, 6), name);
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
        "database.driver": {
            "type": "string",
            "default": "sqlite"
        },
        "database.host": {
            "type": "string",
            "default": "127.0.0.1"
        },
        "database.database": {
            "type": "string",
            "default": "clouddrive"
        },
        "database.username": {
            "type": "string",
            "default": "root"
        },
        "database.password": {
            "type": "string",
            "default": ""
        },
        "display.trash": {
            "type": "bool",
            "default": false
        }
    };

    this.config = new ParameterBag();
    for (var key in Command.defaultConfig) {
        this.config.set(key, defaultConfig[key].default);
    }

    var configPath = this.getConfigPath();
    var savedConfig = {};
    if (fs.existsSync(configPath)) {
        savedConfig = new ParameterBag(JSON.parse(fs.readFileSync(configPath))).flatten();
    }

    for (var i in defaultConfig) {
        var val = defaultConfig[i].default;
        if (savedConfig[i] !== undefined) {
            val = savedConfig[i];
        }

        switch (defaultConfig[i].type) {
            case "bool":
                if (val === "true" || val === 1 || val === "1") {
                    val = true;
                    break;
                }
                val = false;
                break;
            default:
                break;
        }

        this.config.set(i, val);
    }
};

Command.prototype.run = function (cmd, options) {

};

Command.prototype.saveConfig = function () {
    if (!fs.existsSync(this.getConfigPath())) {
        fs.mkdirSync(this.getConfigPath());
    }

    fs.writeFileSync(this.getConfigPath(), JSON.stringify(this.config.getData()));
};

Command.prototype.shutdown = function (code) {
    if (code === undefined) {
        code = 0;
    }

    process.exit(code);
};

Command.error = function (message) {
    process.stderr.write(message.red);
};

Command.info = function (message) {
    process.stdout.write(message.green);
};

Command.log = function (message) {
    console.log(message);
};

Command.spinner = null;

Command.startSpinner = function (message) {
    if (message === undefined) {
        message = '';
    }

    var frame = elegantSpinner();
    Command.spinner = setInterval(function () {
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        process.stdout.write(message + frame().bold.cyan);
    }, 50);
};

Command.stopSpinner = function () {
    clearInterval(Command.spinner);
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
};

module.exports = Command;
