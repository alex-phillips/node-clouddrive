'use strict';

let Command = require('./Command'),
  Logger = require('../Logger'),
  inquirer = require('inquirer'),
  open = require('open');

class InitCommand extends Command {
  run(args, options) {
    return new Promise((resolve, reject) => {
      Command.startSpinner('Initializing... ');

      if (!this.config.get('auth.email')) {
        Command.stopSpinner();

        return reject(Error('Account email must be set via the `config` command'));
      }

      this.initialize((err, data) => {
        Command.stopSpinner();

        if (err) {
          return reject(err);
        }

        if (data.success === true) {
          Logger.info(`Successfully authenticated with Amazon Cloud Drive`);

          return resolve();
        }

        if (data.data.auth_url) {
          if (this.config.get('auth.id') && this.config.get('auth.secret')) {
            Command.output(data.data.message);
            Command.output(data.data.auth_url);
            inquirer.prompt([
              {
                type: 'input',
                name: 'callbackUrl',
                message: 'url: '
              }
            ], answers => {
              this.account.authorize(answers.callbackUrl, {}, (err, data) => {
                if (err) {
                  return reject(err);
                }

                if (data.success === false) {
                  return reject(Error(`Failed to authenticate with Amazon Cloud Drive: ${JSON.stringify(data.data)}`));
                }

                Logger.info('Successfully authenticated with Amazon Cloud Drive');

                return resolve();
              });
            });
          } else {
            Command.output(`For the one-time initial authorization, a browser tab will be opened to 'https://data-mind-687.appspot.com/clouddrive'.
            Accept the authorization and paste in the response into this application.`);
            open('https://data-mind-687.appspot.com/clouddrive');
            inquirer.prompt([
              {
                type: 'input',
                name: 'token',
                message: 'token: '
              }
            ], answers => {
              this.account.authorize(JSON.parse(answers.token.trim()), {}, (err, data) => {
                if (err) {
                  return reject(err);
                }

                if (data.success === false) {
                  return reject(Error(`Failed to authenticate with Amazon Cloud Drive: ${JSON.stringify(data.data)}`));
                }

                Logger.info(`Successfully authenticated with Amazon Cloud Drive`);

                return resolve();
              });
            });
          }
        } else {
          return reject(Error(`Failed to authorize account with Amazon Cloud Drive. Unknown error occurred: ${JSON.stringify(data.data)}`));
        }
      });
    });
  }
}

module.exports = InitCommand;
