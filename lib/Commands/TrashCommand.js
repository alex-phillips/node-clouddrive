'use strict';

let Command = require('./Command'),
  Node = require('../Node'),
  Logger = require('../Logger'),
  async = require('async');

class TrashCommand extends Command {
  async run(args, options) {
    let remotePath = args[0],
      searchFunction = Node.loadByPath,
      notFound = `No node exists at path '${remotePath}'`;
    this.options = options;
    if (options.id) {
      searchFunction = Node.loadById;
      notFound = `No node exists with ID '${remotePath}'`;
    }

    if (remotePath) {
      remotePath = remotePath.trim();
    }

    let init = await this.initialize();
    if (!init.success) {
      throw Error('Account not authorized with Amazon Cloud Drive. Run `init` command first.');
    }

    let node = await searchFunction(remotePath);
    if (!node) {
      throw Error(notFound);
    }

    if (!options.recursive || !node.isFolder()) {
      let retval = await await node.trash();
      if (!retval.success) {
        throw Error('Failed to trash node');
      }

      return Logger.info(`Node at '${remotePath}' successfully moved to trash`);
    }

    Logger.verbose('Recursively removing nodes...', 3);
    await this.trash(node);
  }

  async trash(node) {
    if (node.isFile()) {
      return this.trashNode(node, callback);
    }

    let children = await node.getChildren({
      remote: this.options.remote,
    });
    for (let child of children) {
      if (child.isFolder()) {
        await this.trash(child);
      } else {
        let retval = await this.trashNode(child);
        if (!retval.success) {
          throw Error(JSON.stringify(retval));
        }
      }
    }

    return await this.trashNode(node);
  }

  async trashNode(node) {
    let retval = {
      success: true,
      data: {},
    };

    let path = await node.getPath();
    Logger.verbose(`Attempting to remove ${node.getKind()} node "${node.getName()}" (${node.getId()})`);
    if (node.inTrash()) {
      Logger.warn(`Node ${node.getName()} (${node.getId()}) is already in the trash`);

      return retval;
    }

    let result = await node.trash();
    if (result.success) {
      Logger.info(`Trashed node "${path}" (${node.getId()})`);
    } else {
      Logger.error(`Failed to trash node "${path}" (${node.getId()}): ${JSON.stringify(result)}`);
    }

    return result;
  }
}

module.exports = TrashCommand;
