'use strict';

let Command = require('./Command'),
  Logger = require('../Logger');

class UsageCommand extends Command {
  async run(args, options) {
    let init = await this.initialize();

    if (!init.success) {
      throw Error('Account not authorized with Amazon Cloud Drive. Run `init` command first.');
    }

    let usage = await this.account.getUsage();
    if (this.config.get('json.pretty') === true) {
      let output = JSON.stringify(usage.data, null, 2);
      output.split('\n').forEach(line => {
        Logger.info(line);
      });
    } else {
      Logger.info(JSON.stringify(usage.data));
    }
  }
}

module.exports = UsageCommand;
