'use strict';

let Command = require('./Command'),
  Node = require('../Node'),
  Logger = require('../Logger');

class MoveCommand extends Command {
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

    let node = searchFunction(remotePath);
    if (!node) {
      throw Error(notFound);
    }

    let newParent = await Node.loadByPath(newPath);
    if (!newParent || !newParent.isFolder()) {
      throw Error(`No directory exists at path '${newPath}'`);
    }

    let move = await node.move(newParent);
    if (!move.success) {
      throw Error(`Failed to move node to '${newPath}': ${JSON.stringify(data.data)}`);
    }

    Logger.info(`Successfully moved node to '${newPath}'`);
  }
}

module.exports = MoveCommand;
