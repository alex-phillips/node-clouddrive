'use strict';

let Command = require('./Command'),
  Logger = require('../Logger');

class AboutCommand extends Command {
  async run(args, options) {
    await this.initialize();
    Logger.info(`Config directory: ${Command.getConfigDirectory()}`);
    Logger.info(`Cache directory: ${Command.getCacheDirectory()}`);
    Logger.info(`Log directory: ${Command.getLogDirectory()}`);
  }
}

module.exports = AboutCommand;
