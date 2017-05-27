'use strict';

let Command = require('./Command'),
  Node = require('../Node'),
  Logger = require('../Logger');

class ResolveCommand extends Command {
  async run(args, options) {
    let id = args[0];
    if (!id) {
      throw Error('ID is required to resolve');
    }

    await this.initialize();

    id = id.trim();
    let node = await Node.loadById(id);
    if (!node) {
      throw Error(`No node found with ID '${id}'`);
    }

    Logger.info(await node.getPath());
  }
}

module.exports = ResolveCommand;
