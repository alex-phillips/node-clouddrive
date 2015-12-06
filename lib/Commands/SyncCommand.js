'use strict';

var Command = require('./Command');

class SyncCommand extends Command {
  run() {
    var self = this;

    return new Promise(function(resolve, reject) {
      self.initialize(function(err, data) {
        if (err) {
          return reject(err.message);
        }

        if (!data.success) {
          return reject('Account not authorized with Amazon Cloud Drive. Run `init` command first.');
        }

        Command.startSpinner('Syncing... ');

        self.account.sync(function(err, data) {
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
