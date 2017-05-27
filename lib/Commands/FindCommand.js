'use strict';

let Command = require('./Command'),
  Node = require('../Node');

class FindCommand  extends Command {
  async run(args, options) {
    let query = args[0],
      sort = Command.SORT_BY_NAME;

    if (options.time) {
      sort = Command.SORT_BY_DATE;
    }

    await this.initialize();

    Command.startSpinner('Searching ');
    let nodes = await Node.searchBy('name', query);
    Command.stopSpinner();

    Command.list(nodes, {
      sortOrder: sort,
      showTrash: this.config.get('display.showTrash'),
      showPending: this.config.get('display.showPending')
    });
  }
}

module.exports = FindCommand;
