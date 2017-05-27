'use strict';

let Command = require('./Command'),
  Node = require('../Node'),
  Logger = require('../Logger');

class LinkCommand extends Command {
  async run(args, options) {
    let remotePath = args[0],
      newPath = args[1],
      searchFunction = Node.loadByPath,
      notFound = `No node exists at path '${remotePath}'`;
    if (options.id) {
      searchFunction = Node.loadById;
      notFound = `No node exists with ID '${remotePath}'`;
    }

    if (remotePath) {
      remotePath = remotePath.trim();
    }

    if (!newPath) {
      newPath = '';
    }

    await this.initialize();

    let node = await searchFunction(remotePath);
    if (!node) {
      throw Error(notFound);
    }

    let newParent = await Node.loadByPath(newPath);
    if (!newParent || !newParent.isFolder()) {
      throw Error(`No directory exists at path '${newPath}'`);
    }

    let retval = await node.link(newParent.getId());

    if (!retval.success) {
      throw Error(`Failed to link node to '${newPath ? newPath : '/'}': ${JSON.stringify(retval.data)}`);
    }

    Logger.info(`Successfully linked node to '${newPath ? newPath : '/'}'`);
  }
}

module.exports = LinkCommand;
