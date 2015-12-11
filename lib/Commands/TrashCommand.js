'use strict';

var Command = require('./Command'),
  Node = require('../Node');

class TrashCommand extends Command {
  run(args, options) {
    var remotePath = args[0];
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
          return reject(err);
        }

        if (!data.success) {
          return reject(Error('Account not authorized with Amazon Cloud Drive. Run `init` command first.'));
        }

        searchFunction(remotePath, (err, node) => {
          if (err) {
            return reject(err);
          }

          if (!node) {
            return reject(Error(notFound));
          }

          node.trash((err, data) => {
            if (err) {
              return reject(err);
            }

            if (!data.success) {
              return reject(Error('Failed to trash node'));
            }

            Command.info('Node successfully moved to trash');

            return resolve();
          });
        });
      });
    });
  }
}

module.exports = TrashCommand;
