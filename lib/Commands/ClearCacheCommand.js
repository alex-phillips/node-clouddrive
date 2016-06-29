'use strict';

let Command = require('./Command');

class ClearCacheCommand extends Command {
  run(args, options) {
    return new Promise((resolve, reject) => {
      this.initialize((err, data) => {
        if (err) {
          return reject(err);
        }

        this.account.checkpoint = null;
        this.account.save((err, data) => {
          if (err) {
            return reject(err);
          }

          this.account.cache.deleteAllNodes((err, data) => {
            if (err) {
              return reject(err);
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
