'use strict';

let Command = require('./Command'),
  Node = require('../Node');

class ListPendingCommand extends Command {
  async run(args, options) {
    let sort = Command.SORT_BY_NAME;
    if (options.time) {
      sort = Command.SORT_BY_DATE;
    }

    await this.initialize();

    let nodes = await Node.filter({
      status: 'PENDING'
    });

    Command.list(nodes, {
      sortOrder: sort,
      showTrash: false,
      showPending: true
    });
  }
}

module.exports = ListPendingCommand;
