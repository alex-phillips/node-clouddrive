var Command = require('./Command');
var Node = require('../Node');
var promise = require('promise');

var CatCommand = new Command({
  offline: false
});

CatCommand.run = function(remotePath, options) {
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

          var opts = {
            stream: process.stdout
          };

          if (!node.isFile()) {
            Command.error('Node must be a file');

            return 1;
          }

          return promise.denodeify(node.download).call(node, '', opts)
            .then(function(data) {
              if (data.success) {
                return 0;
              }

              Command.error(data.data.message);

              return 1;
            });
        });
    });
};

module.exports = CatCommand;
