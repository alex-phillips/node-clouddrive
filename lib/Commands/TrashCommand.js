var Command = require('./Command');
var Node = require('../Node');
var promise = require('promise');

var TrashCommand = new Command({
  offline: false
});

TrashCommand.run = function(remotePath, options) {
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
  return promise.denodeify(self.initialize).call(self)
    .then(function() {
      return promise.denodeify(searchFunction)(remotePath)
        .then(function(node) {
          if (!node) {
            Command.error(notFound);

            return 1;
          }

          return promise.denodeify(node.trash).call(node)
            .then(function(data) {
              if (!data.success) {
                Command.error('Failed to trash node');
                Command.log(data.data);
              } else {
                Command.info('Node successfully moved to trash');
              }
            });
        });
    });
};

module.exports = TrashCommand;
