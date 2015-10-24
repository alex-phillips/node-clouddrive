var Command = require('./Command');
var Node = require('../Node');
var promise = require('promise');

var SyncCommand = new Command({
  offline: true
});

SyncCommand.run = function(remotePath, options) {
  var self = this;

  var searchFunction = Node.loadByPath;
  var notFound = 'No node exists at path \'' + remotePath + '\'';
  if (options.id) {
    searchFunction = Node.loadById;
    notFound = 'No node exists with ID \'' + remotePath + '\'';
  }

  if (remotePath) {
    remotePath = remotePath.trim();
  }

  return promise.denodeify(self.initialize).call(self)
    .then(function() {
      return promise.denodeify(searchFunction)(remotePath)
        .then(function(node) {
          if (!node) {
            Command.error(notFound);

            return 1;
          }

          if (self.config.get('json.pretty') === true) {
            Command.log(JSON.stringify(node.getData(), null, 4));
          } else {
            Command.log(JSON.stringify(node.getData()));
          }

          return 0;
        });
    });
};

module.exports = SyncCommand;
