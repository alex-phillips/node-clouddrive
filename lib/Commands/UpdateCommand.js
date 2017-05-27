'use strict';

let Command = require('./Command'),
  Node = require('../Node'),
  Logger = require('../Logger');

class UpdateCommand extends Command {
  async run(args, options) {
    let remotePath = args[0];

    let init = await this.initialize();
    if (!init.success) {
      throw Error('Account not authorized with Amazon Cloud Drive. Run `init` command first.');
    }

    let searchFunction = Node.loadByPath,
      notFound = `No node exists at path '${remotePath}'`;
    if (options.id) {
      searchFunction = Node.loadById;
      notFound = `No node exists with ID '${remotePath}'`;
    }

    if (remotePath) {
      remotePath = remotePath.trim();
    }

    let node = await searchFunction(remotePath);
    if (!node) {
      throw Error(notFound);
    }

    let update = await node.update({
      description: options.description,
      labels: options.labels,
    });
    if (!update.success) {
      throw Error(`Failed to update node metadata`);
    }

    Logger.info(`Successfully updated node metadata`);
  }
}

module.exports = UpdateCommand;
