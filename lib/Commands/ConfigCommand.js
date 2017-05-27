'use strict';

let  Command = require('./Command'),
  Utils = require('../Utils'),
  Logger = require('../Logger'),
  chalk = require('chalk');

class ConfigCommand extends Command {
  async run(args, options) {
    let  option = args[0],
      value = args[1],
      data = this.config.flatten();

    if (option && data[option] === undefined) {
      throw Error(`Option '${option}' not found`);
    }

    if (!option) {
      let keys = Object.keys(data),
        maxSize = keys.sort((a, b) => {
          return b.length - a.length;
        })[0].length;

      for (let key in data) {
        Logger.info(`${Utils.pad(key, maxSize)} = ${chalk.cyan(data[key])}`);
      }

      return this.config.save();
    }

    if (!value) {
      if (options.reset) {
        this.config.reset(option);
        Logger.info(`Reset ${chalk.cyan(option)} to ${this.config.get(option)}`);
      } else {
        Logger.info(data[option]);
      }
    } else {
      this.config.set(option, value);
      Logger.info(`${chalk.cyan(option)} saved`);
    }

    this.config.save();
  }
}

module.exports = ConfigCommand;
