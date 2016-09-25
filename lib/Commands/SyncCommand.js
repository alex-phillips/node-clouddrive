'use strict';

let Command = require('./Command'),
  Logger = require('../Logger');

class SyncCommand extends Command {
  run(args, options) {
    return new Promise((resolve, reject) => {
      this.initialize((err, data) => {
        if (err) {
          return reject(err);
        }

        if (!data.success) {
          return reject(Error('Account not authorized with Amazon Cloud Drive. Run `init` command first.'));
        }

        Command.startSpinner('Syncing... ');

        let params = {};
        if (this.config.get('sync.chunkSize')) {
          params.chunkSize = parseInt(this.config.get('sync.chunkSize'));
        }
        if (this.config.get('sync.maxNodes')) {
          params.maxNodes = parseInt(this.config.get('sync.maxNodes'));
        }

        this.account.sync(params, (err, data) => {
            Command.stopSpinner('Done.');

            if (err) {
              return reject(err);
            }

            return resolve();
          }
        );
      });
    });
  }
}

module.exports = SyncCommand;
