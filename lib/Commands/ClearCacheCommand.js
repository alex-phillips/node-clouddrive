'use strict';

var Command = require('./Command');

class ClearCacheCommand extends Command {
  run() {
    var self = this;

    return new Promise(function(resolve, reject) {
      self.initialize(function(err, data) {
        if (err) {
          return reject(err.message);
        }

        self.account.checkpoint = null;
        self.account.save(function(err, data) {
          if (err) {
            return reject(err.message);
          }

          self.account.cache.deleteAllNodes(function(err, data) {
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
