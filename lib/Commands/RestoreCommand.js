'use strict';

let Command = require('./Command'),
  Node = require('../Node'),
  Logger = require('../Logger'),
  async = require('async');

class RestoreCommand extends Command {
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
      let restore = await node.restore();
      if (restore.success) {
        Logger.info(`Successfully restored node ${node.getName()} (${node.getId()})`);
      } else {
        Logger.error(`Failed to restore node ${node.getName()} (${node.getId()}): ${JSON.stringify(restore)}`);
      }

      return;
    }

    Logger.info('Recursively restoring nodes...');
    await this.restore(node);
  }

  async restore(node) {
    let result = await this.restoreNode(node);
    if (result.success && node.isFolder()) {
      let children = await node.getChildren({
        remote: this.options.remote,
      });

      for (let child of children) {
        await this.restore(child);
      }
    }

    return result;
  }

  async restoreNode(node) {
    let retval = {
      success: true,
      data: {},
    };

    let path = await node.getPath();
    Logger.info(`Attempting to restore ${node.getKind()} node "${path}" (${node.getId()})...`);
    if (!node.inTrash()) {
      Logger.warn(`Node ${node.getName()} (${node.getId()}) is not in the trash`, 2);

      return retval;
    }

    let result = await node.restore();
    if (result.success) {
      Logger.info(`Restored node "${path}" (${node.getId()})`);
    } else {
      Logger.error(`Failed to restore node "${path}" (${node.getId()}): ${JSON.stringify(result)}`);
    }

    return result;
  }
}

module.exports = RestoreCommand;
