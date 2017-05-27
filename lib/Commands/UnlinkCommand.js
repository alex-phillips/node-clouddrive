'use strict';

let Command = require('./Command'),
  Node = require('../Node'),
  Utils = require('../Utils'),
  Logger = require('../Logger');

class LinkCommand extends Command {
  async run(args, options) {
    let id = args[0],
      parentPath = args[1],
      searchFunction = Node.loadByPath,
      notFound = `No directory exists at path '${parentPath}'`;
    if (options.id) {
      searchFunction = Node.loadById;
      notFound = `No directory exists with ID '${parentPath}'`;
    }

    if (id) {
      id = id.trim();
    }

    if (!parentPath) {
      parentPath = '';
    }

    await this.initialize();

    let node = await Node.loadById(id);

    if (!node) {
      throw Error(`No node exists with ID '${id}'`);
    }

    let parentNode = await searchFunction(parentPath);
    if (!parentNode || !parentNode.isFolder()) {
      throw Error('Cannot move root node.');
    }

    if (!node.getParentIds().includes(parentNode.getId())) {
      throw Error(`That node does not exist under that folder`);
    }

    if (node.getParentIds().length <= 1) {
      throw Error(`Cannot unlink Node. Must have 1 remaining parent`);
    }

    let retval = await node.unlink(parentNode.getId());

    if (!retval.success) {
      throw Error(`Failed to unlink node from '${parentPath ? parentPath : '/'}': ${JSON.stringify(retval.data)}`);
    }

    Logger.info(`Successfully unlinked node from '${parentPath ? parentPath : '/'}'`);
  }
}

module.exports = LinkCommand;
