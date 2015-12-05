var Command = require('./Command');
var Node = require('../Node');

var TrashCommand = new Command({
  offline: false
});

TrashCommand.run = function(remotePath, options) {
  var searchFunction = Node.loadByPath;
  var notFound = `No node exists at path '${remotePath}'`;
  if (options.id) {
    searchFunction = Node.loadById;
    notFound = `No node exists with ID '${remotePath}'`;
  }

  if (remotePath) {
    remotePath = remotePath.trim();
  }

  var self = this;

  return new Promise(function(resolve, reject) {
    self.initialize(function(err, data) {
      if (err) {
        return reject(err.message);
      }

      if (!data.success) {
        return reject('Account not authorized with Amazon Cloud Drive. Run `init` command first.');
      }

      searchFunction(remotePath, function(err, node) {
        if (err) {
          return reject(err.message);
        }

        if (!node) {
          return reject(notFound);
        }

        node.trash(function(err, data) {
          if (err) {
            return reject(err.message);
          }

          if (!data.success) {
            return reject('Failed to trash node');
          }

          Command.info('Node successfully moved to trash');

          return resolve();
        })
      });
    });
  });
};

module.exports = TrashCommand;
