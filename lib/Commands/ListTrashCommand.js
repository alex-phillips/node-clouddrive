'use strict';

let Command = require('./Command'),
  Node = require('../Node'),
  Logger = require('../Logger');

class ListTrashCommand extends Command {
  run(args, options) {
    return new Promise((resolve, reject) => {
      let sort = Command.SORT_BY_NAME;
      if (options.time) {
        sort = Command.SORT_BY_DATE;
      }

      this.initialize((err, data) => {
        if (err) {
          return reject(err);
        }

        if (options.remote) {
          Node.getTrash((err, result) => {
            if (err) {
              return reject(err);
            }

            Logger.info(JSON.stringify(result));
          });
        } else {
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
        }
      });
    });
  }
}

module.exports = ListTrashCommand;
