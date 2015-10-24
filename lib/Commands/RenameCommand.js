var Command = require('./Command');
var Node = require('../Node');
var promise = require('promise');

var RenameCommand = new Command({
  offline: false
});

RenameCommand.run = function(remotePath, name, options) {
  var self = this;

  return promise.denodeify(self.initialize).call(self)
    .then(function() {
      return promise.denodeify(self.account.authorize).call(self.account, null)
        .then(function(data) {
          if (data.success === true) {
            var searchFunction = Node.loadByPath;
            var notFound = 'No node exists at path \'' + remotePath + '\'';
            if (options.id) {
              searchFunction = Node.loadById;
              notFound = 'No node exists with ID \'' + remotePath + '\'';
            }

            if (remotePath) {
              remotePath = remotePath.trim();
            }

            return promise.denodeify(searchFunction)(remotePath)
              .then(function(node) {
                if (!node) {
                  Command.error(notFound);

                  return 1;
                }

                return promise.denodeify(node.rename).call(node, name)
                  .then(function(data) {
                    if (data.success) {
                      Command.info('Successfully renamed node to \'' + name + '\'');

                      return 0;
                    }

                    Command.error('Failed to rename node to \'' + name + '\'');

                    return 1;
                  });
              });
          } else {
            Command.error('Account not authorized with Amazon Cloud Drive. Run `init` command first.');

            return 1;
          }
        });
    });
};

module.exports = RenameCommand;
