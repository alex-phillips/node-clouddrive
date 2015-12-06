'use strict';

var Command = require('./Command');

class InfoCommand extends Command {
  run() {
    return new Promise((resolve, reject) => {
      this.initialize((err, data) => {
        if (err) {
          return reject(err.message);
        }

        if (!data.success) {
          return reject('Account not authorized with Amazon Cloud Drive. Run `init` command first.');
        }

        this.account.getInfo((err, data) => {
          if (err) {
            return reject(err.message);
          }

          if (this.config.get('json.pretty') === true) {
            Command.log(JSON.stringify(data.data, null, 4));
          } else {
            Command.log(JSON.stringify(data.data));
          }

          return resolve();
        });
      })
    });
  }
}

module.exports = InfoCommand;
