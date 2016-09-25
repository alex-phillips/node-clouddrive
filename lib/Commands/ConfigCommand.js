'use strict';

let  Command = require('./Command'),
  Utils = require('../Utils'),
  chalk = require('chalk');

class ConfigCommand extends Command {
  run(args, options) {
    return new Promise((resolve, reject) => {
      let  option = args[0],
        value = args[1],
        data = this.config.flatten();

      if (!option) {
        let keys = Object.keys(data),
          maxSize = keys.sort((a, b) => {
            return b.length - a.length;
          })[0].length;

        for (let key in data) {
          Command.output(`${Utils.pad(key, maxSize)} = ${chalk.cyan(data[key])}`);
        }

        this.config.save();

        return resolve();
      } else if (data[option] === undefined) {
        return reject(Error(`Option '${option}' not found`));
      }

      if (!value) {
        if (options.reset) {
          this.config.reset(option);
          Command.output(`Reset ${chalk.cyan(option)} to ${this.config.get(option)}`);
        } else {
          Command.output(data[option]);
        }
      } else {
        this.config.set(option, value);
        Command.output(`${chalk.cyan(option)} saved`);
      }

      this.config.save();

      return resolve();
    });
  }
}

module.exports = ConfigCommand;
