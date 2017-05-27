'use strict';

let Command = require('./Command'),
  Node = require('../Node'),
  Logger = require('../Logger');

class MkdirCommand extends Command {
  async run(args, options) {
    let path = args[0];

    let init = await this.initialize();
    if (!init.success) {
      throw Error('Account not authorized with Amazon Cloud Drive. Run `init` command first.');
    }

    let retval = await Node.createDirectoryPath(path, {});
    if (!retval.success) {
      throw Error(`Failed creating remote directory '${path}'`);
    }

    Logger.info(`Successfully created remote directory '${path}'`);
  }
}

module.exports = MkdirCommand;
