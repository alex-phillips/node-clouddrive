'use strict';

var Command = require('./Command');

class QuotaCommand extends Command {
  run() {
    return new Promise((resolve, reject) => {
      this.initialize((err, data) => {
        if (err) {
          return reject(err);
        }

        if (!data.success) {
          return reject(Error('Account not authorized with Amazon Cloud Drive. Run `init` command first.'));
        }

        this.account.getQuota((err, data) => {
          if (err) {
            return reject(err);
          }

          if (this.config.get('json.pretty') === true) {
            Command.log(JSON.stringify(data.data, null, 4));
          } else {
            Command.log(JSON.stringify(data.data));
          }

          return resolve();
        });
      });
    });
  }
}

module.exports = QuotaCommand;
