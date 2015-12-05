var Command = require('./Command');
var Node = require('../Node');

var MoveCommand = new Command({
  offline: false
});

MoveCommand.run = function(remotePath, newPath, options) {
  var self = this;

  if (!newPath) {
    newPath = '';
  }

  return new Promise(function(resolve, reject) {
    self.initialize(function(err, data) {
      if (err) {
        return reject(err.message);
      }

      if (!data.success) {
        return reject('Account not authorized with Amazon Cloud Drive. Run `init` command first.');
      }

      Node.loadByPath(remotePath, function(err, node) {
        if (err) {
          return reject(err.message);
        }

        if (!node) {
          return reject('No node exists at path \'' + remotePath + '\'');
        }

        Node.loadByPath(newPath, function(err, newParent) {
          if (err) {
            return reject(err.message);
          }

          if (!newParent || !newParent.isFolder()) {
            return reject('No directory exists at path \'' + newPath + '\'');
          }

          node.move(newParent, function(err, data) {
            if (err) {
              return reject(err.message);
            }

            if (!data.success) {
              return reject('Failed to move node to \'' + newPath + '\'', data.data);
            }

            Command.info('Successfully moved node to \'' + newPath + '\'');

            return resolve();
          });
        });
      });
    });
  });
};

module.exports = MoveCommand;
