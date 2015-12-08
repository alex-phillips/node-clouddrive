'use strict';

var path = require('path'),
  fs = require('fs'),
  ParameterBag = require('../ParameterBag'),
  Account = require('../Account'),
  Node = require('../Node'),
  Utils = require('../Utils'),
  colors = require('colors'),
  moment = require('moment'),
  elegantSpinner = require('elegant-spinner'),
  spinner = null,
  defaultConfig = {
    'email': {
      'type': 'string',
      'default': ''
    },
    'client-id': {
      'type': 'string',
      'default': ''
    },
    'client-secret': {
      'type': 'string',
      'default': ''
    },
    'json.pretty': {
      'type': 'bool',
      'default': false
    },
    'upload.duplicates': {
      'type': 'bool',
      'default': false
    },
    'database.driver': {
      'type': 'string',
      'default': 'sqlite'
    },
    'database.host': {
      'type': 'string',
      'default': '127.0.0.1'
    },
    'database.database': {
      'type': 'string',
      'default': 'clouddrive'
    },
    'database.username': {
      'type': 'string',
      'default': 'root'
    },
    'database.password': {
      'type': 'string',
      'default': ''
    },
    'show.trash': {
      'type': 'bool',
      'default': true
    },
    'show.pending': {
      'type': 'bool',
      'default': true
    }
  };

class Command {
  constructor(config) {
    var defaults = {
      offline: false
    };

    if (config === undefined) {
      config = {};
    }

    for (let key in config) {
      if (defaults[key] === undefined) {
        continue;
      }

      defaults[key] = config[key];
    }

    this.params = defaults;
  }

  execute() {
    this.readConfig();

    try {
      this.run.apply(this, arguments)
        .then(() => {
          this.shutdown(0);
        }, (err) => {
          if (err) {
            Command.error(err.message);
          }
          this.shutdown(1);
        });
    } catch (err) {
      if (err) {
        Command.error(err.message);
      }
      this.shutdown(1);
    }
  }

  initialize(callback) {
    this.initializeDatabase((err) => {
      if (err) {
        return callback(err);
      }

      this.account.load((err) => {
        if (err) {
          return callback(err);
        }

        if (this.params.offline === false) {
          return this.account.authorize(null, (err, data) => {
            if (err) {
              return callback(err);
            }

            return callback(null, data);
          });
        }

        return callback();
      });
    });
  }

  initializeDatabase(callback) {
    switch (this.config.get('database.driver')) {
      case 'sqlite':
        var SQLite = require('../Cache/SQLite3');
        new SQLite({
          client: 'sqlite3',
          connection: {
            filename: `${Command.getCacheDirectory()}/${this.config.get('email')}.db`
          }
        }, (err, cache) => {
          this.account = new Account(this.config.get('email'), this.config.get('client-id'), this.config.get('client-secret'), cache);
          Node.init(this.account, cache);
          callback(null);
        });
        break;
      case 'mysql':
        var MySQL = require('../Cache/MySQL');
        new MySQL({
          client: 'mysql',
          connection: {
            host: this.config.get('database.host'),
            user: this.config.get('database.username'),
            password: this.config.get('database.password'),
            database: this.config.get('database.database')
          }
        }, (err, cache) => {
          this.account = new Account(this.config.get('email'), this.config.get('client-id'), this.config.get('client-secret'), cache);
          Node.init(this.account, cache);
          callback(null);
        });
        break;
      case 'mongo':
        var Mongo = require('../Cache/Mongo');
        new Mongo({}, (err, cache) => {
          this.account = new Account(this.config.get('email'), this.config.get('client-id'), this.config.get('client-secret'), cache);
          Node.init(this.account, cache);
          callback(null);
        });
        break;
    }
  }

  readConfig() {
    this.config = new ParameterBag();
    var configPath = Command.getConfigPath();
    var savedData = {};
    if (fs.existsSync(configPath)) {
      savedData = JSON.parse(fs.readFileSync(configPath));
    }
    var savedConfig = new ParameterBag(savedData);

    for (let key in defaultConfig) {
      var val = defaultConfig[key].default;
      if (savedConfig.get(key)) {
        val = savedConfig.get(key);
      }

      this.setConfigValue(key, val);
    }
  }

  run(cmd, options) {

  }

  saveConfig() {
    if (!fs.existsSync(Command.getCacheDirectory())) {
      fs.mkdirSync(Command.getCacheDirectory());
    }

    fs.writeFileSync(Command.getConfigPath(), JSON.stringify(this.config.getData()));
  }

  shutdown(code) {
    if (code === undefined) {
      code = 0;
    }

    process.exit(code);
  }

  resetConfigValue(key) {
    if (defaultConfig[key] !== undefined) {
      this.config.set(key, defaultConfig.default);
    }
  }

  setConfigValue(key, value) {
    switch (defaultConfig[key].type) {
      case 'bool':
        if (typeof value === 'boolean') {
          break;
        }

        if (value === 'true' || value === 1 || value === '1') {
          value = true;
          break;
        }
        value = false;
        break;
      default:
        break;
    }

    this.config.set(key, value);
  }

  static error(message) {
    console.log(message.white.bgRed);
  }

  static getCacheDirectory() {
    return (Utils.getHomeDirectory() || Utils.getTmpDirectory()) + '/.cache/clouddrive-node';
  }

  static getConfigPath() {
    var cacheDir = `${Command.getCacheDirectory()}/config.json`;
    return path.resolve(cacheDir);
  }

  static info(message) {
    console.log(message.green);
  }

  static list(nodes, options) {
    if (!options) {
      options = {};
    }

    switch (options.sortOrder) {
      case Command.SORT_BY_DATE:
        nodes.sort((a, b) => {
          if (a.getModifiedDate() < b.getModifiedDate()) {
            return -1;
          }
          if (a.getModifiedDate() > b.getModifiedDate()) {
            return 1;
          }

          return 0;
        });
        break;
      default:
        nodes.sort((a, b) => {
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

    for (let i = 0; i < nodes.length; i++) {
      var node = nodes[i];

      if (node.inTrash() && options.showTrash === false) {
        continue;
      }

      if (node.isPending() && options.showPending === false) {
        continue;
      }

      var now = new Date();
      var modified = new Date(node.get('modifiedDate'));
      var month = moment(modified).format('MMM');
      var day = moment(modified).format('D');
      if (day.length === 1) {
        day = ` ${day}`;
      }
      var date = `${month} ${day}   ${moment(modified).format('YYYY')}`;
      if (now.getYear() === modified.getYear()) {
        date = `${month} ${day}  ${moment(modified).format('HH:mm')}`;
      }

      var name = node.isFolder() ? node.getName().blue : node.getName();
      var size = Utils.convertFileSize(node.getSize(), 0);

      console.log('%s  %s  %s %s %s %s', node.getId(), date, Utils.pad(node.getStatus(), 10), Utils.pad(node.getKind(), 7), Utils.pad(size, 6), name);
    }
  }

  static log(message) {
    console.log(message);
  }

  static warn(message) {
    console.log(message.yellow);
  }

  static startSpinner(message) {
    if (message === undefined) {
      message = '';
    }

    var frame = elegantSpinner();
    spinner = setInterval(() => {
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      process.stdout.write(message + frame().bold.cyan);
    }, 50);
  }

  static stopSpinner() {
    clearInterval(spinner);
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
  }
}

Command.SORT_BY_NAME = 'name';
Command.SORT_BY_DATE = 'date';

module.exports = Command;
