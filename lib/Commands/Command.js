var path = require('path');
var fs = require('fs');
var ParameterBag = require('../ParameterBag');
var Account = require('../Account');
var Node = require('../Node');
var Utils = require('../Utils');
var colors = require('colors');
var moment = require('moment');
var elegantSpinner = require('elegant-spinner');

function Command(config) {
  var defaults = {
    offline: false
  };

  if (config === undefined) {
    config = {};
  }

  for (var key in config) {
    if (defaults[key] === undefined) {
      continue;
    }

    defaults[key] = config[key];
  }

  this.params = defaults;
}

Command.SORT_BY_NAME = 'name';
Command.SORT_BY_DATE = 'date';

Command.prototype.execute = function() {
  var self = this;
  self.readConfig();

  try {
    self.run.apply(self, arguments)
      .then(function(code) {
        self.shutdown(code);
      }, function(err) {
        Command.error(err.message);
        self.shutdown(1);
      });
  } catch (err) {
    Command.error(err.message);
    self.shutdown(1);
  }
};

Command.prototype.getCacheDirectory = function() {
  return (Utils.getHomeDirectory() || Utils.getTmpDirectory()) + '/.cache/clouddrive-node';
};

Command.prototype.getConfigPath = function() {
  var cacheDir = this.getCacheDirectory() + '/config.json';
  return path.resolve(cacheDir);
};

Command.prototype.initialize = function(callback) {
  var self = this;
  self.initializeDatabase(function(err) {
    if (err) {
      return callback(err);
    }

    self.account.load(function(err) {
      if (err) {
        return callback(err);
      }

      if (self.params.offline === false) {
        return self.account.authorize(null, function(err, data) {
          if (err) {
            return callback(err);
          }

          return callback(null, data);
        });
      }

      return callback();
    });
  });
};

Command.prototype.initializeDatabase = function(callback) {
  var self = this;
  switch (this.config.get('database.driver')) {
    case 'sqlite':
      var SQLite = require('../Cache/SQLite3');
      new SQLite({
        client: 'sqlite3',
        connection: {
          filename: self.getCacheDirectory() + '/' + self.config.get('email') + '.db'
        }
      }, function(err, cache) {
        self.account = new Account(self.config.get('email'), self.config.get('client-id'), self.config.get('client-secret'), cache);
        Node.init(self.account, cache);
        callback(null);
      });
      break;
    case 'mysql':
      var MySQL = require('../Cache/MySQL');
      new MySQL({
        client: 'mysql',
        connection: {
          host: self.config.get('database.host'),
          user: self.config.get('database.username'),
          password: self.config.get('database.password'),
          database: self.config.get('database.database')
        }
      }, function(err, cache) {
        self.account = new Account(self.config.get('email'), self.config.get('client-id'), self.config.get('client-secret'), cache);
        Node.init(self.account, cache);
        callback(null);
      });
      break;
    case 'mongo':
      var Mongo = require('../Cache/Mongo');
      new Mongo({}, function(err, cache) {
        self.account = new Account(self.config.get('email'), self.config.get('client-id'), self.config.get('client-secret'), cache);
        Node.init(self.account, cache);
        callback(null);
      });
      break;
  }
};

Command.prototype.list = function(nodes, sortOrder, showTrash, showPending) {
  if (showTrash === undefined) {
    showTrash = false;
  }

  if (showPending === undefined) {
    showPending = false;
  }

  switch (sortOrder) {
    case Command.SORT_BY_DATE:
      nodes.sort(function(a, b) {
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
      nodes.sort(function(a, b) {
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

    if (node.inTrash() && showTrash === false) {
      continue;
    }

    if (node.isPending() && showPending === false) {
      continue;
    }

    var now = new Date();
    var modified = new Date(node.get('modifiedDate'));
    var date = moment(modified).format('MMM DD YY');
    if (now.getYear() === modified.getYear()) {
      date = moment(modified).format('MMM DD HH:mm');
    }

    var name = node.isFolder() ? node.getName().blue : node.getName();
    var size = Utils.convertFileSize(node.getSize(), 0);

    console.log('%s  %s  %s %s %s %s', node.getId(), date, Utils.pad(node.getStatus(), 10), Utils.pad(node.getKind(), 7), Utils.pad(size, 6), name);
  }
};

Command.prototype.readConfig = function() {
  this.config = new ParameterBag();
  var configPath = this.getConfigPath();
  var savedData = {};
  if (fs.existsSync(configPath)) {
    savedData = JSON.parse(fs.readFileSync(configPath));
  }
  var savedConfig = new ParameterBag(savedData);

  for (var key in Command.defaultConfig) {
    var val = Command.defaultConfig[key].default;
    if (savedConfig.get(key)) {
      val = savedConfig.get(key);
    }

    this.setConfigValue(key, val);
  }

  var test = 1;
};

Command.prototype.run = function(cmd, options) {

};

Command.prototype.saveConfig = function() {
  if (!fs.existsSync(this.getCacheDirectory())) {
    fs.mkdirSync(this.getCacheDirectory());
  }

  fs.writeFileSync(this.getConfigPath(), JSON.stringify(this.config.getData()));
};

Command.prototype.shutdown = function(code) {
  if (code === undefined) {
    code = 0;
  }

  process.exit(code);
};

Command.prototype.resetConfigValue = function(key) {
  if (Command.defaultConfig[key] !== undefined) {
    this.config.set(key, Command.defaultConfig.default);
  }
};

Command.prototype.setConfigValue = function(key, value) {
  switch (Command.defaultConfig[key].type) {
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
};

Command.defaultConfig = {
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

Command.error = function(message) {
  console.error(message.white.bgRed);
};

Command.info = function(message) {
  console.log(message.green);
};

Command.log = function(message) {
  console.log(message);
};

Command.warn = function(message) {
  console.log(message.yellow);
};

Command.spinner = null;

Command.startSpinner = function(message) {
  if (message === undefined) {
    message = '';
  }

  var frame = elegantSpinner();
  Command.spinner = setInterval(function() {
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write(message + frame().bold.cyan);
  }, 50);
};

Command.stopSpinner = function() {
  clearInterval(Command.spinner);
  process.stdout.clearLine();
  process.stdout.cursorTo(0);
};

module.exports = Command;
