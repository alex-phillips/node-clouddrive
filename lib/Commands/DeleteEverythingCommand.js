'use strict';

let Command = require('./Command'),
  Node = require('../Node'),
  Logger = require('../Logger'),
  async = require('async'),
  fs = require('fs-extra'),
  inquirer = require('inquirer');

class DeleteEverythingCommand extends Command {
  run(args, options) {
    return new Promise((resolve, reject) => {
      inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'really delete everything? ',
          default: false,
        }
      ], answers => {
        if (!answers.confirm) {
          return resolve();
        }

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
    });
  }
}

module.exports = DeleteEverythingCommand;
