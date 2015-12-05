var Command = require('./Command');
var Node = require('../Node');

var CatCommand = new Command({
  offline: false
});

CatCommand.run = function(remotePath, options) {
  var self = this;

  var searchFunction = Node.loadByPath;
  var notFound = `No node exists at path '${remotePath}'`;
  if (options.id) {
    searchFunction = Node.loadById;
    notFound = `No node exists with ID '${emotePath}'`;
  }

  if (remotePath) {
    remotePath = remotePath.trim();
  }

  return new Promise(function(resolve, reject) {
    self.initialize(function(err, data) {
      if (err) {
        return reject(err.message);
      }

      searchFunction(remotePath, function(err, node) {
        if (err) {
          return reject(err);
        }

        if (!node) {
          return reject(notFound);
        }

        var opts = {
          stream: process.stdout
        };

        if (!node.isFile()) {
          return reject('Node must be a file');
        }

        node.download('', opts, function(err, data) {
          if (err) {
            return reject(err);
          }

          if (data.success) {
            return resolve();
          }

          return reject(data.data.message);
        });
      });
    });
  });
};

module.exports = CatCommand;
