'use strict';

let Command = require('./Command'),
  Node = require('../Node'),
  Logger = require('../Logger');

class UpdateCommand extends Command {
  run(args, options) {
    return new Promise((resolve, reject) => {
      let remotePath = args[0];

      this.initialize((err, data) => {
        if (err) {
          return reject(err);
        }

        if (!data.success) {
          return reject(Error('Account not authorized with Amazon Cloud Drive. Run `init` command first.'));
        }

        let searchFunction = Node.loadByPath,
          notFound = `No node exists at path '${remotePath}'`;
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

          node.update({
            description: options.description,
            labels: options.labels,
          }, (err, data) => {
            if (err) {
              return reject(err);
            }

            if (!data.success) {
              return reject(Error(`Failed to update node metadata`));
            }

            Logger.info(`Successfully updated node metadata`);

            return resolve();
          });
        });
      });
    });
  }
}

module.exports = UpdateCommand;
