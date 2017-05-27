'use strict';

let Command = require('./Command'),
  Logger = require('../Logger'),
  inquirer = require('inquirer'),
  open = require('open');

class InitCommand extends Command {
  async run(args, options) {
    if (!this.config.get('auth.email')) {
      throw Error('Account email must be set via the `config` command');
    }

    Command.startSpinner('Initializing... ');
    let init = await this.initialize();
    Command.stopSpinner();

    if (init.success === true) {
      return Logger.info(`Successfully authenticated with Amazon Cloud Drive`);
    }

    if (init.data.auth_url) {
      if (this.config.get('auth.id') && this.config.get('auth.secret')) {
        Logger.info(data.data.message);
        Logger.info(data.data.auth_url);

        let answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'callbackUrl',
            message: 'url: '
          }
        ]);

        let auth = await this.account.authorize(answers.callbackUrl, {});
        if (auth.success === false) {
          throw Error(`Failed to authenticate with Amazon Cloud Drive: ${JSON.stringify(data.data)}`);
        }

        return Logger.info('Successfully authenticated with Amazon Cloud Drive');
      }

      Logger.info(`For the one-time initial authorization, a browser tab will be opened to 'https://data-mind-687.appspot.com/clouddrive'.
      Accept the authorization and paste in the response into this application.`);

      open('https://data-mind-687.appspot.com/clouddrive');
      let answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'token',
          message: 'token: '
        }
      ]);

      let auth = await this.account.authorize(JSON.parse(answers.token.trim()), {});
      if (auth.success === false) {
        throw Error(`Failed to authenticate with Amazon Cloud Drive: ${JSON.stringify(data.data)}`);
      }

      return Logger.info(`Successfully authenticated with Amazon Cloud Drive`);
    }

    throw Error(`Failed to authorize account with Amazon Cloud Drive. Unknown error occurred: ${JSON.stringify(data.data)}`);
  }
}

module.exports = InitCommand;
