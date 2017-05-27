'use strict';

let Command = require('./Command'),
  Node = require('../Node'),
  Logger = require('../Logger');

class MetadataCommand extends Command {
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

    let nodes = await searchFunction(remotePath);
    if (!node) {
      Logger.error(notFound);
    } else {
      if (this.config.get('json.pretty') === true) {
        let output = JSON.stringify(node.getData(), null, 2);
        output.split('\n').forEach(line => {
          Logger.info(line);
        });
      } else {
        Logger.info(JSON.stringify(node.getData()));
      }
    }
  }
}

module.exports = MetadataCommand;
