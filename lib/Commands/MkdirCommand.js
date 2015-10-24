var Command = require('./Command');
var Node = require('../Node');
var Promise = require('promise');

var RenameCommand = new Command({
  offline: false
});

RenameCommand.run = function(path, options) {
  var self = this;

  return Promise.denodeify(self.initialize).call(self)
    .then(function() {
      return Promise.denodeify(self.account.authorize).call(self.account, null)
        .then(function(data) {
          if (data.success === true) {
            return Promise.denodeify(Node.createDirectoryPath)(path)
              .then(function(data) {
                if (!data.success) {
                  Command.error('Failed creating remote directory \'' + path + '\'');

                  return 1;
                }

                Command.info('Successfully created remote directory \'' + path + '\'');
              });
          } else {
            Command.error('Account not authorized with Amazon Cloud Drive. Run `init` command first.');

            return 1;
          }
        });
    });
};

module.exports = RenameCommand;
