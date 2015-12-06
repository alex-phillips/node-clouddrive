'use strict';

var Command = require('./Command'),
  Node = require('../Node');

class RestoreCommand extends Command {
  run(remotePath, options) {
    var searchFunction = Node.loadByPath;
    var notFound = `No node exists at path '${remotePath}'`;
    if (options.id) {
      searchFunction = Node.loadById;
      notFound = `No node exists with ID '${remotePath}'`;
    }

    if (remotePath) {
      remotePath = remotePath.trim();
    }

    return new Promise((resolve, reject) => {
      this.initialize((err, data) => {
        if (err) {
          return reject(err.message);
        }

        if (!data.success) {
          return reject('Account not authorized with Amazon Cloud Drive. Run `init` command first.');
        }

        searchFunction(remotePath, (err, node) => {
          if (err) {
            return reject(err.message);
          }

          if (!node) {
            return reject(notFound);
          }

          Command.startSpinner();

          node.restore((err, data) => {
            Command.stopSpinner();

            if (err) {
              return reject(err.message);
            }

            if (!data.success) {
              return reject('Failed to restore node');
            }

            Command.info('Node successfully stored from trash');

            return resolve();
          });
        });
      });
    });
  }
}

module.exports = RestoreCommand;
