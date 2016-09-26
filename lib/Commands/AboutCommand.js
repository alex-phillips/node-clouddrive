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

        Command.output(`Config directory: ${Command.getConfigDirectory()}`);
        Command.output(`Cache directory: ${Command.getCacheDirectory()}`);
        Command.output(`Log directory: ${Command.getLogDirectory()}`);

        return resolve();
      });
    });
  }
}

module.exports = AboutCommand;
