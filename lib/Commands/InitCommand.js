var Command = require('./Command');
var inquirer = require('inquirer');
var open = require('open');
var promise = require('promise');

var InitCommand = new Command({
  offline: false
});

InitCommand.run = function() {
  var self = this;
  Command.startSpinner('Initializing... ');

  if (!this.config.get('email')) {
    Command.stopSpinner();
    throw new Error('Account email must be set via the `config` command');
  }

  return promise.denodeify(self.initialize).call(self)
    .then(function() {
      Command.stopSpinner();

      return promise.denodeify(self.account.authorize).call(self.account, null)
        .then(function(data) {
          if (data.success === true) {
            Command.info('Successfully authenticated with Amazon Cloud Drive');

            return 0;
          } else {
            if (data.data.auth_url !== undefined) {
              return new promise(function(resolve, reject) {
                if (self.config.get('client-id') && self.config.get('client-secret')) {
                  Command.log(data.data.message);
                  Command.log(data.data.auth_url);
                  inquirer.prompt([
                    {
                      type: 'input',
                      name: 'callbackUrl',
                      message: 'url: '
                    }
                  ], function(answers) {
                    self.account.authorize(answers.callbackUrl, function(err, data) {
                      if (err) {
                        Command.error(err.message);

                        return reject();
                      }

                      if (data.success === false) {
                        Command.error('Failed to authenticate with Amazon Cloud Drive: ');
                        Command.log(data.data);

                        return reject();
                      }

                      Command.info('Successfully authenticated with Amazon Cloud Drive');

                      return resolve();
                    });
                  });
                } else {
                  Command.log('For the one-time initial authorization, a browser tab will be opened. ' +
                    'Accept the authorization and paste in the response into this application.');
                  open('https://data-mind-687.appspot.com/clouddrive');
                  inquirer.prompt([
                    {
                      type: 'input',
                      name: 'token',
                      message: 'token: '
                    }
                  ], function(answers) {
                    self.account.authorize(JSON.parse(answers.token.trim()), function(err, data) {
                      if (err) {
                        Command.error(err.message);

                        return reject();
                      }

                      if (data.success === false) {
                        Command.error('Failed to authenticate with Amazon Cloud Drive: ');
                        Command.log(data.data);

                        return reject();
                      }

                      Command.info('Successfully authenticated with Amazon Cloud Drive');

                      return resolve();
                    });
                  });
                }
              })
                .then(function() {
                  return 0;
                }, function() {
                  return 1;
                });
            } else {
              Command.error('Failed to authorize account with Amazon Cloud Drive. Unknown error occurred.');
              Command.log(JSON.stringify(data.data));

              return 1;
            }
          }
        }, function(err) {
          Command.error(err.message);

          return 1;
        });
    });
};

module.exports = InitCommand;
