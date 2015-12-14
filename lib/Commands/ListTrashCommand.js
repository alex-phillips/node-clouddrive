'use strict';

var Command = require('./Command'),
  Node = require('../Node');

class ListTrashCommand extends Command {
  run(args, options) {
    return new Promise((resolve, reject) => {
      var sort = Command.SORT_BY_NAME;
      if (options.time) {
        sort = Command.SORT_BY_DATE;
      }

      this.initialize((err, data) => {
        if (err) {
          return reject(err);
        }

        Node.filter({
          status: 'TRASH'
        }, (err, nodes) => {
          Command.list(nodes, {
            sortOrder: sort,
            showTrash: true,
            showPending: false
          });

          return resolve();
        });
      });
    });
  }
}

module.exports = ListTrashCommand;
