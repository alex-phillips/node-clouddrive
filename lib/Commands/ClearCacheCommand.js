'use strict';

let Command = require('./Command');

class ClearCacheCommand extends Command {
  async run(args, options) {
    await this.initialize();

    this.account.checkpoint = null;
    await this.account.save();
    await this.account.cache.deleteAllNodes();
  }
}

module.exports = ClearCacheCommand;
