'use strict';

let Command = require('./Command'),
  Node = require('../Node'),
  Logger = require('../Logger');

class RenameCommand extends Command {
  async run(args, options) {
    let remotePath = args[0],
      name = args[1];

    let init = await this.initialize();

    if (!data.success) {
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

    let result = await node.rename(name);
    if (!result.success) {
      throw Error(`Failed to rename node to '${name}'`);
    }

    Logger.info(`Successfully renamed node to '${name}'`);
  }
}

module.exports = RenameCommand;
