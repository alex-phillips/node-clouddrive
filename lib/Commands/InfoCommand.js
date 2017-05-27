'use strict';

let Command = require('./Command'),
  Logger = require('../Logger');

class InfoCommand extends Command {
  async run(args, options) {
    let init = await this.initialize();
    if (!init.success) {
      return reject(Error('Account not authorized with Amazon Cloud Drive. Run `init` command first.'));
    }

    let info = await this.account.getInfo();
    if (this.config.get('json.pretty') === false) {
      return Logger.info(JSON.stringify(info.data));
    }

    let output = JSON.stringify(info.data, null, 2);
    output.split('\n').forEach(line => {
      Logger.info(line);
    });
  }
}

module.exports = InfoCommand;
