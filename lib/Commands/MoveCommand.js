'use strict';

var Command = require('./Command'),
  Node = require('../Node');

class MoveCommand extends Command {
  run(remotePath, newPath, options) {
    if (!newPath) {
      newPath = '';
    }

    return new Promise((resolve, reject) => {
      this.initialize((err, data) => {
        if (err) {
          return reject(err.message);
        }

        if (!data.success) {
          return reject('Account not authorized with Amazon Cloud Drive. Run `init` command first.');
        }

        Node.loadByPath(remotePath, (err, node) => {
          if (err) {
            return reject(err.message);
          }

          if (!node) {
            return reject(`No node exists at path '${remotePath}'`);
          }

          Node.loadByPath(newPath, (err, newParent) => {
            if (err) {
              return reject(err.message);
            }

            if (!newParent || !newParent.isFolder()) {
              return reject(`No directory exists at path '${newPath}'`);
            }

            node.move(newParent, (err, data) => {
              if (err) {
                return reject(err.message);
              }

              if (!data.success) {
                return reject(`Failed to move node to '${newPath}': ${data.data}`);
              }

              Command.info(`Successfully moved node to '${newPath}'`);

              return resolve();
            });
          });
        });
      });
    });
  }
}

module.exports = MoveCommand;
