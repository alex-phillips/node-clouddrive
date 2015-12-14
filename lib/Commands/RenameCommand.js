'use strict';

var Command = require('./Command'),
  Node = require('../Node');

class RenameCommand extends Command {
  run(args, options) {
    return new Promise((resolve, reject) => {
      var remotePath = args[0],
        name = args[1];

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
              return reject(Error(`Failed to rename node to '${name}'`));
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
