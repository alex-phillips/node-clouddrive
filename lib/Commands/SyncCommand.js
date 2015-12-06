'use strict';

var Command = require('./Command');

class SyncCommand extends Command {
  run() {
    return new Promise((resolve, reject) => {
      this.initialize((err, data) => {
        if (err) {
          return reject(err.message);
        }

        if (!data.success) {
          return reject('Account not authorized with Amazon Cloud Drive. Run `init` command first.');
        }

        Command.startSpinner('Syncing... ');

        this.account.sync((err, data) => {
          Command.stopSpinner();

          if (err) {
            return reject(err.message);
          }

          Command.log('Done.');

          return resolve();
        });
      });
    });
  }
}

module.exports = SyncCommand;
