'use strict';

var Command = require('./Command'),
  Node = require('../Node');

class FindCommand  extends Command {
  run(args, options) {
    return new Promise((resolve, reject) => {
      var query = args[0],
        sort = Command.SORT_BY_NAME;
      if (options.time) {
        sort = Command.SORT_BY_DATE;
      }

      this.initialize((err, data) => {
        if (err) {
          return reject(err);
        }

        Command.startSpinner('Searching ');

        Node.searchBy('name', query, (err, nodes) => {
          Command.stopSpinner();

          if (err) {
            return reject(err);
          }

          Command.list(nodes, {
            sortOrder: sort,
            showTrash: this.config.get('show.trash'),
            showPending: this.config.get('show.pending')
          });

          return resolve();
        });
      });
    });
  }
}

module.exports = FindCommand;
