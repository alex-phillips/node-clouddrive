'use strict';

var Command = require('./Command'),
  Node = require('../Node'),
  Utils = require('../Utils');

class LinkCommand extends Command {
  run(args, options) {
    return new Promise((resolve, reject) => {
      var id = args[0],
        parentPath = args[1],
        searchFunction = Node.loadByPath,
        notFound = `No directory exists at path '${parentPath}'`;
      if (options.id) {
        searchFunction = Node.loadById;
        notFound = `No directory exists with ID '${parentPath}'`;
      }

      if (id) {
        id = id.trim();
      }

      if (!parentPath) {
        parentPath = '';
      }

      this.initialize((err, data) => {
        if (err) {
          return reject(err);
        }

        Node.loadById(id, (err, node) => {
          if (err) {
            return reject(err);
          }

          if (!node) {
            return reject(Error(`No node exists with ID '${id}'`));
          }

          searchFunction(parentPath, (err, parentNode) => {
            if (err) {
              return reject(err);
            }

            if (!parentNode || !parentNode.isFolder()) {
              return reject(Error());
            }

            if (!node.getParentIds().includes(parentNode.getId())) {
              return reject(Error(`That node does not exist under that folder`));
            }

            if (node.getParentIds().length <= 1) {
              return reject(Error(`Cannot unlink Node. Must have 1 remaining parent`));
            }

            node.unlink(parentNode.getId(), (err, data) => {
              if (err) {
                return reject(err);
              }

              if (!data.success) {
                return reject(Error(`Failed to unlink node from '${parentPath ? parentPath : '/'}': ${JSON.stringify(data.data)}`));
              }

              Command.info(`Successfully unlinked node from '${parentPath ? parentPath : '/'}'`);

              return resolve();
            });
          });
        });
      });
    });
  }
}

module.exports = LinkCommand;
