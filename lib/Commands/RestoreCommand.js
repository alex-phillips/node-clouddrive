var Command = require('./Command');
var Node = require('../Node');
var Promise = require('promise');

var RestoreCommand = new Command({
  offline: false
});

RestoreCommand.run = function(remotePath, options) {
  var searchFunction = Node.loadByPath;
  var notFound = 'No node exists at path \'' + remotePath + '\'';
  if (options.id) {
    searchFunction = Node.loadById;
    notFound = 'No node exists with ID \'' + remotePath + '\'';
  }

  if (remotePath) {
    remotePath = remotePath.trim();
  }

  var self = this;

  return Promise.denodeify(self.initialize).call(self)
    .then(function() {
      return Promise.denodeify(searchFunction)(remotePath)
        .then(function(node) {
          if (!node) {
            Command.error(notFound);

            return 1;
          }

          Command.startSpinner();

          return Promise.denodeify(node.restore).call(node)
            .then(function(data) {
              Command.stopSpinner();
              if (!data.success) {
                Command.error('Failed to restore node');
              } else {
                Command.info('Node successfully stored from trash');
              }
            });
        });
    });
};

module.exports = RestoreCommand;
