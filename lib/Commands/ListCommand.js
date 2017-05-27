'use strict';

let Command = require('./Command'),
  Node = require('../Node'),
  async = require('async'),
  inquirer = require('inquirer');

class ListCommand extends Command {
  async run(args, options) {
    let remotePath = args[0],
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

    await this.initialize();

    let node = await searchFunction(remotePath);
    if (!node) {
      throw Error(notFound);
    }

    let children = await node.getChildren({
      remote: options.remote,
    });

    let opts = {
      sortOrder: sort,
      showTrash: this.config.get('display.showTrash'),
      showPending: this.config.get('display.showPending'),
      displayDate: this.config.get('display.date'),
      decrypt: options.decrypt,
      password: this.config.get('crypto.password'),
      algorithm: this.config.get('crypto.algorithm'),
    };

    if (options.decrypt && options.password) {
      let answers = await inquirer.prompt([
        {
          type: 'password',
          name: 'password',
          message: 'password: ',
        },
      ]);

      opts.password = answers.password;
    }

    Command.list(children, opts);
  }
}

module.exports = ListCommand;
