'use strict';

var Command = require('./Command'),
  Node = require('../Node');

class TrashCommand extends Command {
  run(args, options) {
    return new Promise((resolve, reject) => {
      var remotePath = args[0],
        searchFunction = Node.loadByPath,
        notFound = `No node exists at path '${remotePath}'`;
      if (options.id) {
        searchFunction = Node.loadById;
        notFound = `No node exists with ID '${remotePath}'`;
      }

      if (remotePath) {
        remotePath = remotePath.trim();
      }

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
