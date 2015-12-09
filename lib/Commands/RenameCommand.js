'use strict';

var Command = require('./Command'),
  Node = require('../Node');

class RenameCommand extends Command {
  run(remotePath, name, options) {
    return new Promise((resolve, reject) => {
      this.initialize((err, data) => {
        if (err) {
          return reject(err);
        }

        if (!data.success) {
          return reject(Error('Account not authorized with Amazon Cloud Drive. Run `init` command first.'));
        }

        var searchFunction = Node.loadByPath;
        var notFound = `No node exists at path '${remotePath}'`;
        if (options.id) {
          searchFunction = Node.loadById;
          notFound = `No node exists with ID '${remotePath}'`;
        }

        if (remotePath) {
          remotePath = remotePath.trim();
        }

        searchFunction(remotePath, (err, node) => {
          if (err) {
            return reject(err);
          }

          if (!node) {
            return reject(Error(notFound));
          }

          node.rename(name, (err, data) => {
            if (err) {
              return reject(err);
            }

            if (!data.success) {
              return reject(`Failed to rename node to '${name}'`);
            }

            Command.info(`Successfully renamed node to '${name}'`);

            return resolve();
          });
        });
      });
    });
  }
}

module.exports = RenameCommand;
