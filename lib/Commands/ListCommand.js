'use strict';

var Command = require('./Command'),
  Node = require('../Node');

class ListCommand extends Command {
  run(args, options) {
    return new Promise((resolve, reject) => {
      var remotePath = args[0],
        searchFunction = Node.loadByPath,
        notFound = `No node exists at path '${remotePath}'`,
        sort = Command.SORT_BY_NAME;

      if (options.id) {
        searchFunction = Node.loadById;
        notFound = `No node exists with ID '${remotePath}'`;
      }

      if (options.time) {
        sort = Command.SORT_BY_DATE;
      }

      if (remotePath) {
        remotePath = remotePath.trim();
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

          node.getChildren((err, children) => {
            if (err) {
              return reject(err);
            }

            Command.list(children, {
              sortOrder: sort,
              showTrash: this.config.get('show.trash'),
              showPending: this.config.get('show.pending'),
              displayDate: this.config.get('display.date')
            });

            return resolve();
          });
        });
      });
    });
  }
}

module.exports = ListCommand;
