'use strict';

var ParameterBag = require('./ParameterBag'),
  fs = require('fs'),
  path = require('path'),
  defaultConfig = {};

class Config extends ParameterBag {
  constructor(filePath, baseConfig) {
    defaultConfig = baseConfig ? baseConfig : {};

    var config = {};
    if (fs.existsSync(filePath)) {
      config = JSON.parse(fs.readFileSync(filePath));
    }
    config = new ParameterBag(config);

    for (let key in defaultConfig) {
      var val = defaultConfig[key].default;
      var savedValue = config.get(key);
      if (savedValue !== null) {
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

        if (value === true || value === 'true' || value === 1 || value === '1') {
          value = true;
          break;
        }
        value = false;
        break;
      case 'choice':
        if (defaultConfig[key].choices.indexOf(value) === -1) {
          throw Error(`Invalid value. Must be one of the following: ${defaultConfig[key].choices.join(', ')}`);
        }
        break;
      default:
        break;
    }

    return super.set(key, value);
  }
}

module.exports = Config;
