'use strict';

let Command = require('./Command'),
  Node = require('../Node'),
  async = require('async'),
  Utils = require('../Utils'),
  Logger = require('../Logger');

class DiskUsageCommand extends Command {
  async run(args, options) {
    let remotePath = args[0],
      searchFunction = Node.loadByPath,
      notFound = `No node exists at path '${remotePath}'`;
    if (options.id) {
      searchFunction = Node.loadById;
      notFound = `No node exists with ID '${remotePath}'`;
    }

    if (remotePath) {
      remotePath = remotePath.trim();
    }

    await this.initialize();

    let node = await searchFunction(remotePath);
    if (!node) {
      throw Error(notFound);
    }

    let size = 0,
      files = 0,
      folders = 0;

    Command.startSpinner('Calculating ');
    await calculateSize(node);
    Command.stopSpinner();

    Logger.info(Utils.convertFileSize(size));
    Logger.info(`${files} files, ${folders} folders`);

    async function calculateSize(node, callback) {
      let children = await node.getChildren({
        remote: options.remote,
      });

      for (let child of children) {
        let nodeSize = child.getSize();
        if (nodeSize) {
          size += nodeSize;
        }

        if (child.isFolder()) {
          folders++;
          await calculateSize(child);
          continue;
        }

        files++;
      }
    }
  }
}

module.exports = DiskUsageCommand;
