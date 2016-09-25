'use strict';

let Command = require('./Command'),
  Logger = require('../Logger');

class InfoCommand extends Command {
  run(args, options) {
    return new Promise((resolve, reject) => {
      this.initialize((err, data) => {
        if (err) {
          return reject(err);
        }

        if (!data.success) {
          return reject(Error('Account not authorized with Amazon Cloud Drive. Run `init` command first.'));
        }

        this.account.getInfo((err, data) => {
          if (err) {
            return reject(err);
          }

          if (this.config.get('json.pretty') === true) {
            Command.output(JSON.stringify(data.data, null, 4));
          } else {
            Command.output(JSON.stringify(data.data));
          }

          return resolve();
        });
      });
    });
  }
}

module.exports = InfoCommand;
