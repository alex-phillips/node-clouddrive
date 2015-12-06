'use strict';

var Command = require('./Command');

class ClearCacheCommand extends Command {
  run() {
    return new Promise((resolve, reject) => {
      this.initialize((err, data) => {
        if (err) {
          return reject(err.message);
        }

        this.account.checkpoint = null;
        this.account.save((err, data) => {
          if (err) {
            return reject(err.message);
          }

          this.account.cache.deleteAllNodes((err, data) => {
            if (err) {
              return reject(err.message);
            }

            Command.log('Done.');

            return resolve();
          });
        });
      });
    });
  }
}

module.exports = ClearCacheCommand;
