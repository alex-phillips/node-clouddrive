'use strict';

let Command = require('./Command'),
  Logger = require('../Logger');

class QuotaCommand extends Command {
  run(args, options) {
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
            let output = JSON.stringify(data.data, null, 2);
            output.split('\n').forEach(line => {
              Logger.info(line);
            });
          } else {
            Logger.info(JSON.stringify(data.data));
          }

          return resolve();
        });
      });
    });
  }
}

module.exports = QuotaCommand;
