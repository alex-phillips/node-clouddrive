'use strict';

var Command = require('./Command'),
  Node = require('../Node');

class MoveCommand extends Command {
  run(args, options) {
    return new Promise((resolve, reject) => {
      var remotePath = args[0],
        newPath = args[1];
      if (!newPath) {
        newPath = '';
      }

      this.initialize((err, data) => {
        if (err) {
          return reject(err);
        }

        if (!data.success) {
          return reject(Error('Account not authorized with Amazon Cloud Drive. Run `init` command first.'));
        }

        Node.loadByPath(remotePath, (err, node) => {
          if (err) {
            return reject(err);
          }

          if (!node) {
            return reject(`No node exists at path '${remotePath}'`);
          }

          Node.loadByPath(newPath, (err, newParent) => {
            if (err) {
              return reject(err);
            }

            if (!newParent || !newParent.isFolder()) {
              return reject(`No directory exists at path '${newPath}'`);
            }

            node.move(newParent, (err, data) => {
              if (err) {
                return reject(err);
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
