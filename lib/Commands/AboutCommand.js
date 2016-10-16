'use strict';

let Command = require('./Command'),
  Logger = require('../Logger');

class AboutCommand extends Command {
  run(args, options) {
    return new Promise((resolve, reject) => {
      this.initialize((err, data) => {
        if (err) {
          return reject(err);
        }

        Logger.info(`Config directory: ${Command.getConfigDirectory()}`);
        Logger.info(`Cache directory: ${Command.getCacheDirectory()}`);
        Logger.info(`Log directory: ${Command.getLogDirectory()}`);

        return resolve();
      });
    });
  }
}

module.exports = AboutCommand;
