'use strict';

let Command = require('./Command'),
  Node = require('../Node'),
  Logger = require('../Logger');

class ListTrashCommand extends Command {
  async run(args, options) {
    let sort = Command.SORT_BY_NAME;
    if (options.time) {
      sort = Command.SORT_BY_DATE;
    }

    await this.initialize();

    if (options.remote) {
      let result = await Node.getTrash();
      Logger.info(JSON.stringify(result));
    } else {
      let nodes = await Node.filter({
        status: 'TRASH'
      });
      Command.list(nodes, {
        sortOrder: sort,
        showTrash: true,
        showPending: false
      });
    }
  }
}

module.exports = ListTrashCommand;
