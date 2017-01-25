'use strict';

let ParameterBag = require('./ParameterBag'),
  fs = require('fs'),
  path = require('path'),
  defaultConfig = {};

class Config extends ParameterBag {
  constructor(filePath, baseConfig = {}) {
    defaultConfig = baseConfig;

    let config = {};
    try {
      fs.statSync(filePath);
      config = JSON.parse(fs.readFileSync(filePath));
    } catch (e) {}

    config = new ParameterBag(config);

    for (let key in defaultConfig) {
      let val = defaultConfig[key].default,
        savedValue = config.get(key);
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
      this.set(key, defaultConfig[key].default);
    }
  }

  save() {
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
          throw Error(`Invalid value '${value}'. Must be one of the following: ${defaultConfig[key].choices.join(', ')}`);
        }
        break;
      default:
        break;
    }

    return super.set(key, value);
  }
}

module.exports = Config;
