var Command = require('./Command');
var promise = require('promise');

var SyncCommand = new Command({
  offline: false
});

SyncCommand.run = function() {
  var self = this;

  return promise.denodeify(self.initialize).call(self)
    .then(function() {
      return promise.denodeify(self.account.authorize).call(self.account, null)
        .then(function(data) {
          if (data.success === true) {
            Command.startSpinner('Syncing... ');

            return promise.denodeify(self.account.sync).call(self.account)
              .then(function() {
                Command.stopSpinner();
                Command.log('Done.');

                return 0;
              }, function(err) {
                Command.stopSpinner();
                Command.error(err.message);

                return 1;
              });
          } else {
            Command.error('Account not authorized with Amazon Cloud Drive. Run `init` command first.');

            return 1;
          }
        }, function(err) {
          Command.error(err.message);

          return 1;
        });
    });
};

module.exports = SyncCommand;
