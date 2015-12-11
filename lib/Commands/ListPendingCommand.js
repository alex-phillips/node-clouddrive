'use strict';

var Command = require('./Command'),
  Node = require('../Node');

class ListPendingCommand extends Command {
  run(args, options) {
    var sort = Command.SORT_BY_NAME;
    if (options.time) {
      sort = Command.SORT_BY_DATE;
    }

    return new Promise((resolve, reject) => {
      this.initialize((err, data) => {
        if (err) {
          return reject(err);
        }

        Node.filter({
          status: 'PENDING'
        }, (err, nodes) => {
          Command.list(nodes, {
            sortOrder: sort,
            showTrash: false,
            showPending: true
          });

          return resolve();
        });
      });
    });
  }
}

module.exports = ListPendingCommand;
