var Command = require('./Command');

var SyncCommand = new Command({
  offline: false
});

SyncCommand.run = function() {
  var self = this;

  return new Promise(function(resolve, reject) {
    self.initialize(function(err, data) {
      if (err) {
        return reject(err.message);
      }

      if (!data.success) {
        return reject('Account not authorized with Amazon Cloud Drive. Run `init` command first.');
      }

      Command.startSpinner('Syncing... ');

      self.account.sync(function(err, data) {
        Command.stopSpinner();

        if (err) {
          return reject(err.message);
        }

        Command.log('Done.');

        return resolve();
      });
    });
  });
};

module.exports = SyncCommand;
