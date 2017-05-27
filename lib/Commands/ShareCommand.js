'use strict';

let Command = require('./Command'),
  Node = require('../Node'),
  Logger = require('../Logger');

class ShareCommand extends Command {
  async run(args, options) {
    let remotePath = args[0];

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

    if (!node.isFile()) {
      throw Error('Links can only be created for files.');
    }

    let metadata = await node.getMetadata(true);
    if (metadata.success === false) {
      throw Error(`Failed to retrieve metadata for node '${remotePath}': ${JSON.stringify(data.data)}`);
    }

    if (data.data.tempLink === undefined) {
      throw Error('Failed retrieving temporary link. Make sure you have permission.');
    }

    Logger.info(`Share link: ${data.data.tempLink}`);
  }
}

module.exports = ShareCommand;
