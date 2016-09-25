'use strict';

let Command = require('./Command'),
  Node = require('../Node'),
  Logger = require('../Logger');

class MoveCommand extends Command {
  run(args, options) {
    return new Promise((resolve, reject) => {
      let remotePath = args[0],
        newPath = args[1],
        searchFunction = Node.loadByPath,
        notFound = `No node exists at path '${remotePath}'`;
      if (options.id) {
        searchFunction = Node.loadById;
        notFound = `No node exists with ID '${remotePath}'`;
      }

      if (remotePath) {
        remotePath = remotePath.trim();
      }

      if (!newPath) {
        newPath = '';
      }

      this.initialize((err, data) => {
        if (err) {
          return reject(err);
        }

        searchFunction(remotePath, (err, node) => {
          if (err) {
            return reject(err);
          }

          if (!node) {
            return reject(Error(notFound));
          }

          Node.loadByPath(newPath, (err, newParent) => {
            if (err) {
              return reject(err);
            }

            if (!newParent || !newParent.isFolder()) {
              return reject(Error(`No directory exists at path '${newPath}'`));
            }

            node.move(newParent, (err, data) => {
              if (err) {
                return reject(err);
              }

              if (!data.success) {
                return reject(Error(`Failed to move node to '${newPath}': ${JSON.stringify(data.data)}`));
              }

              Logger.info(`Successfully moved node to '${newPath}'`);

              return resolve();
            });
          });
        });
      });
    });
  }
}

module.exports = MoveCommand;
