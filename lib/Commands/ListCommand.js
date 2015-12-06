'use strict';

var Command = require('./Command'),
  Node = require('../Node');

class ListCommand extends Command {
  run(remotePath, options) {
    var searchFunction = Node.loadByPath;
    var notFound = `No node exists at path '${remotePath}'`;
    if (options.id) {
      searchFunction = Node.loadById;
      notFound = `No node exists with ID '${remotePath}'`;
    }

    var sort = Command.SORT_BY_NAME;
    if (options.time) {
      sort = Command.SORT_BY_DATE;
    }

    if (remotePath) {
      remotePath = remotePath.trim();
    }

    return new Promise((resolve, reject) => {
      this.initialize((err, data) => {
        if (err) {
          return reject(err.message);
        }

        searchFunction(remotePath, (err, node) => {
          if (err) {
            return reject(err.message);
          }

          if (!node) {
            return reject(notFound);
          }

          node.getChildren((err, children) => {
            if (err) {
              return reject(err.message);
            }

            Command.list(children, {
              sortOrder: sort,
              showTrash: this.config.get('show.trash'),
              showPending: this.config.get('show.pending')
            });

            return resolve();
          });
        });
      });
    });
  }
}

module.exports = ListCommand;
