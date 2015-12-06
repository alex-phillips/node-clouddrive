'use strict';

var Command = require('./Command'),
  Utils = require('../Utils'),
  colors = require('colors');

class ConfigCommand extends Command {
  run(option, value, options) {
    return new Promise((resolve, reject) => {
      var data = this.config.flatten();

      if (option === undefined) {
        var keys = Object.keys(data);
        var maxSize = keys.sort((a, b) => {
          return b.length - a.length;
        })[0].length;

        for (let key in data) {
          Command.log(`${Utils.pad(key, maxSize)} = ${colors.blue(data[key])}`);
        }

        return resolve();
      } else if (data[option] === undefined) {
        return reject(`Option '${option}' not found`);
      }

      if (value === undefined) {
        if (options.remove) {
          this.resetConfigValue(option);
          this.saveConfig();
          Command.log(`Reset ${option.blue}`);
        } else {
          Command.log(data[option]);
        }

        return resolve();
      }

      this.setConfigValue(option, value);
      this.saveConfig();
      Command.log(`${option.cyan} saved`);

      return resolve();
    });
  }
}

module.exports = ConfigCommand;
