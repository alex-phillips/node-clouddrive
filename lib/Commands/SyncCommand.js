'use strict';

let Command = require('./Command'),
  Logger = require('../Logger');

class SyncCommand extends Command {
  async run(args, options) {
    let data = await this.initialize();
    if (!data.success) {
      throw Error('Account not authorized with Amazon Cloud Drive. Run `init` command first.');
    }

    Command.startSpinner('Syncing... ');

    let params = {};
    if (this.config.get('sync.chunkSize')) {
      params.chunkSize = parseInt(this.config.get('sync.chunkSize'));
    }
    if (this.config.get('sync.maxNodes')) {
      params.maxNodes = parseInt(this.config.get('sync.maxNodes'));
    }

    await this.account.sync(params);
    Command.stopSpinner('Done.');
  }
}

module.exports = SyncCommand;
