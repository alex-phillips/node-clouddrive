'use strict';

var Command = require('./Command');

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

        this.account.sync({
            maxNodes: 5000
          }, (err, data) => {
            Command.stopSpinner();

            if (err) {
              return reject(err);
            }

            Command.log('Done.');

            return resolve();
          }
        );
      });
    });
  }
}

module.exports = SyncCommand;
