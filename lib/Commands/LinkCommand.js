var Command = require('./Command');
var Node = require('../Node');
var promise = require('promise');

var LinkCommand = new Command({
  offline: false
});

LinkCommand.run = function(remotePath, options) {
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

                if (!node.isFile()) {
                  Command.error('Links can only be created for files.');

                  return 1;
                }

                return promise.denodeify(node.getMetadata).call(node, true)
                  .then(function(data) {
                    if (data.success === false) {
                      Command.error('Failed to retrieve metadata for node \'' + remotePath + '\'');
                      Command.log(data.data);

                      return 1;
                    }

                    if (data.data.tempLink === undefined) {
                      Command.error('Failed retrieving temporary link. Make sure you have permission.');

                      return 1;
                    }

                    Command.log(data.data.tempLink);

                    return 0;
                  });
              });
          } else {
            Command.error('Account not authorized with Amazon Cloud Drive. Run `init` command first.');

            return 1;
          }
        });
    });
};

module.exports = LinkCommand;
