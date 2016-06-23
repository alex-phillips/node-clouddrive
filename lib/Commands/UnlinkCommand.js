'use strict';

var Command = require('./Command'),
  Node = require('../Node'),
  Utils = require('../Utils');

class LinkCommand extends Command {
  run(args, options) {
    return new Promise((resolve, reject) => {
      var remotePath = args[0],
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

          Node.loadByPath(newPath, (err, oldParent) => {
            if (err) {
              return reject(err);
            }

            if (!oldParent || !oldParent.isFolder()) {
              return reject(Error(`No directory exists at path '${newPath}'`));
            }

            if (!Utils.arrayContains(node.getParentIds(), oldParent.getId())) {
              return reject(Error(`That node does not exist under that folder`));
            }

            if (node.getParentIds().length <= 1) {
              return reject(Error(`Cannot unlink Node. Must have 1 remaining parent`));
            }

            node.unlink(oldParent.getId(), (err, data) => {
              if (err) {
                return reject(err);
              }

              if (!data.success) {
                return reject(Error(`Failed to unlink node from '${newPath ? newPath : '/'}': ${JSON.stringify(data.data)}`));
              }

              Command.info(`Successfully unlinked node from '${newPath ? newPath : '/'}'`);

              return resolve();
            });
          });
        });
      });
    });
  }
}

module.exports = LinkCommand;
