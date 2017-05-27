'use strict';

let Command = require('./Command'),
  Logger = require('../Logger');

class QuotaCommand extends Command {
  async run(args, options) {
    let init = await this.initialize();

    if (!init.success) {
      throw Error('Account not authorized with Amazon Cloud Drive. Run `init` command first.');
    }

    let quota = await this.account.getQuota();
    if (this.config.get('json.pretty') === true) {
      let output = JSON.stringify(quota.data, null, 2);
      output.split('\n').forEach(line => {
        Logger.info(line);
      });
    } else {
      Logger.info(JSON.stringify(quota.data));
    }
  }
}

module.exports = QuotaCommand;
