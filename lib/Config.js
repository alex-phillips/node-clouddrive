'use strict';

var ParameterBag = require('./ParameterBag'),
  fs = require('fs'),
  path = require('path'),
  defaultConfig = {
    'email': {
      type: 'string',
      default: ''
    },
    'cli.colors': {
      type: 'bool',
      default: true
    },
    'cli.progressBars': {
      type: 'bool',
      default: true
    },
    'client-id': {
      type: 'string',
      default: ''
    },
    'client-secret': {
      type: 'string',
      default: ''
    },
    'json.pretty': {
      type: 'bool',
      default: false
    },
    'upload.duplicates': {
      type: 'bool',
      default: false
    },
    'upload.retryAttempts': {
      type: 'string',
      default: 1
    },
    'database.driver': {
      type: 'string',
      default: 'sqlite'
    },
    'database.host': {
      type: 'string',
      default: '127.0.0.1'
    },
    'database.database': {
      type: 'string',
      default: 'clouddrive'
    },
    'database.username': {
      type: 'string',
      default: 'root'
    },
    'database.password': {
      type: 'string',
      default: ''
    },
    'show.trash': {
      type: 'bool',
      default: true
    },
    'show.pending': {
      type: 'bool',
      default: true
    }
  };

class Config extends ParameterBag {
  constructor(filePath) {
    var config = {};
    if (fs.existsSync(filePath)) {
      config = JSON.parse(fs.readFileSync(filePath));
    }
    config = new ParameterBag(config);

    for (let key in defaultConfig) {
      var val = defaultConfig[key].default;
      var savedValue = config.get(key);
      if (savedValue !== undefined) {
        val = savedValue;
      }

      config[key] = val;
    }

    super(config);
    this.filePath = filePath;
  }

  reset(key) {
    if (defaultConfig[key] !== undefined) {
      this.set(key, defaultConfig.default);
    }
  }

  save() {
    var dirPath = path.dirname(this.filePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath);
    }

    fs.writeFileSync(this.filePath, JSON.stringify(this.getData()));
  }

  set(key, value) {
    if (!defaultConfig[key]) {
      return;
    }

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

    return super.set(key, value);
  }
}

module.exports = Config;
