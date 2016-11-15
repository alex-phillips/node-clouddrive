'use strict';

let Command = require('./Command'),
  Node = require('../Node'),
  Logger = require('../Logger'),
  async = require('async'),
  fs = require('fs-extra');

class DeleteEverythingCommand extends Command {
  run(args, options) {
    return new Promise((resolve, reject) => {
      Command.startSpinner('Removing all files and folders');
      async.waterfall([
        callback => {
          Logger.verbose(`Removing cache directory ${Command.getCacheDirectory()}`);
          fs.remove(Command.getCacheDirectory(), callback);
        },
        callback => {
          Logger.verbose(`Removing config directory ${Command.getConfigDirectory()}`);
          fs.remove(Command.getConfigDirectory(), callback);
        },
        callback => {
          Logger.verbose(`Removing log directory ${Command.getLogDirectory()}`);
          fs.remove(Command.getLogDirectory(), callback);
        },
      ], err => {
        if (err) {
          return reject(err);
        }

        Command.stopSpinner('Done.');

        return resolve();
      });
    });
  }
}

module.exports = DeleteEverythingCommand;
