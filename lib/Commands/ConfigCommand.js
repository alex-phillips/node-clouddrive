'use strict';

var Command = require('./Command'),
  Utils = require('../Utils'),
  colors = require('colors');

class ConfigCommand extends Command {
  run(args, options) {
    return new Promise((resolve, reject) => {
      var option = args[0],
        value = args[1],
        data = this.config.flatten();

      if (!option) {
        var keys = Object.keys(data);
        var maxSize = keys.sort((a, b) => {
          return b.length - a.length;
        })[0].length;

        for (let key in data) {
          Command.log(`${Utils.pad(key, maxSize)} = ${colors.cyan(data[key])}`);
        }

        this.config.save();

        return resolve();
      } else if (data[option] === undefined) {
        return reject(Error(`Option '${option}' not found`));
      }

      if (!value) {
        if (options.reset) {
          this.config.reset(option);
          Command.log(`Reset ${option.cyan}`);
        } else {
          Command.log(data[option]);
        }
      } else {
        this.config.set(option, value);
        Command.log(`${option.cyan} saved`);
      }

      this.config.save();

      return resolve();
    });
  }
}

module.exports = ConfigCommand;
