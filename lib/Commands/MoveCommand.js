var Command = require('./Command');
var Node = require('../Node');
var promise = require('promise');

var MoveCommand = new Command({
  offline: false
});

MoveCommand.run = function(remotePath, newPath, options) {
  var self = this;

  if (!newPath) {
    newPath = '';
  }

  return promise.denodeify(self.initialize).call(self)
    .then(function() {
      return promise.denodeify(self.account.authorize).call(self.account, null)
        .then(function(data) {
          if (data.success === true) {
            return promise.denodeify(Node.loadByPath)(remotePath)
              .then(function(node) {
                if (!node) {
                  var notFound = 'No node exists at path \'' + remotePath + '\'';
                  Command.error(notFound);

                  return 1;
                }

                return promise.denodeify(Node.loadByPath)(newPath)
                  .then(function(newParent) {
                    if (!newParent || !newParent.isFolder()) {
                      var notFound = 'No directory exists at path \'' + newPath + '\'';
                      Command.error(notFound);

                      return 1;
                    }

                    return promise.denodeify(node.move).call(node, newParent)
                      .then(function(data) {
                        if (data.success) {
                          Command.info('Successfully moved node to \'' + newPath + '\'');
                        } else {
                          Command.error('Failed to move node to \'' + newPath + '\'');
                          Command.log(data.data);
                        }
                      });
                  });
              });
          } else {
            Command.error('Account not authorized with Amazon Cloud Drive. Run `init` command first.');

            return 1;
          }
        });
    });
};

module.exports = MoveCommand;
