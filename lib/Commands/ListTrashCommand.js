'use strict';

var Command = require('./Command');
var Node = require('../Node');

class ListTrashCommand extends Command {
  run(options) {
    var self = this;

    var sort = Command.SORT_BY_NAME;
    if (options.time) {
      sort = Command.SORT_BY_DATE;
    }

    return new Promise(function(resolve, reject) {
      self.initialize(function(err, data) {
        if (err) {
          return reject(err.message);
        }

        Node.filter({
          status: 'TRASH'
        }, function(err, nodes) {
          Command.list(nodes, {
            sortOrder: sort,
            showTrash: false,
            showPending: true
          });

          return resolve();
        });
      })
    });
  }
}

module.exports = ListTrashCommand;
